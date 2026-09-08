/// Offline-first report queue.
///
/// Persists drafts as JSON in a local directory (path_provider when wired) or
/// falls back to shared_preferences keys so no native plugin is required to
/// compile. When the network is reachable each queued report is POSTed to the
/// PocketBase articles REST API (ReporterConfig.submitEndpoint) and marked
/// `sent`; offline reports keep status `queued` and an in-app periodic timer
/// retries them (WorkManager replacement for background sync is documented in
/// README_REPORTER.md — the foreground Timer here is the CI-safe scaffold).
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/supabase_client.dart';
import '../config.dart';
import '../models.dart';

typedef ConnectivityProbe = Future<bool> Function();

/// Real reachability probe — tries the API base. Injectable for tests.
Future<bool> _defaultProbe() async {
  try {
    final res = await http
        .get(Uri.parse('${ReporterConfig.apiBase}/api/health'))
        .timeout(const Duration(seconds: 6));
    return res.statusCode < 500;
  } catch (_) {
    return false;
  }
}

class OfflineQueue extends ChangeNotifier {
  OfflineQueue._();
  static final OfflineQueue instance = OfflineQueue._();

  static const _storageKey = 'bv_reporter_queue_v1';
  final List<FieldReport> _reports = [];
  Timer? _retryTimer;
  bool _listening = false;
  ConnectivityProbe probe = _defaultProbe;
  bool _online = true;

  List<FieldReport> get reports => List.unmodifiable(_reports);
  bool get isOnline => _online;

  Future<void> init() async {
    await load();
    _listening = true;
    // Retry every 30s while the app is foregrounded (WorkManager takes over
    // in production for background sync — see README_REPORTER.md).
    _retryTimer?.cancel();
    _retryTimer = Timer.periodic(const Duration(seconds: 30), (_) => syncNow());
    syncNow();
  }

  Future<void> load() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final raw = sp.getString(_storageKey);
      _reports.clear();
      if (raw != null && raw.isNotEmpty) {
        final list = jsonDecode(raw) as List;
        _reports.addAll(
          list
              .map((e) => FieldReport.fromJson(e as Map<String, dynamic>))
              .toList(),
        );
      }
    } catch (_) {
      _reports.clear();
    }
    notifyListeners();
  }

  Future<void> persist() async {
    try {
      final sp = await SharedPreferences.getInstance();
      await sp.setString(
        _storageKey,
        jsonEncode(_reports.map((r) => r.toJson()).toList()),
      );
    } catch (_) {}
  }

  Future<void> enqueue(FieldReport report) async {
    _reports.insert(0, report);
    await persist();
    notifyListeners();
    if (_listening) unawaited(syncNow());
  }

  /// Replace a report (used to update status after send).
  Future<void> update(String id, FieldReport report) async {
    final i = _reports.indexWhere((r) => r.id == id);
    if (i >= 0) {
      _reports[i] = report;
      await persist();
      notifyListeners();
    }
  }

  Future<void> remove(String id) async {
    _reports.removeWhere((r) => r.id == id);
    await persist();
    notifyListeners();
  }

  Future<int> pendingCount() async => _reports.length;

  /// Attempt to flush queued reports. Returns number sent.
  Future<int> syncNow() async {
    _online = await probe();
    notifyListeners();
    if (!_online || ReporterConfig.forceOffline) return 0;

    var sent = 0;
    for (final r in _reports.toList()) {
      if (r.status != ReportStatus.queued && r.status != ReportStatus.sending) {
        continue;
      }
      await update(r.id, r.copyWith(status: ReportStatus.sending));
      final ok = await _postReport(r);
      if (ok) {
        sent++;
        await update(
          r.id,
          r.copyWith(status: ReportStatus.sent, updatedAt: DateTime.now()),
        );
      } else {
        await update(
          r.id,
          r.copyWith(status: ReportStatus.queued, updatedAt: DateTime.now()),
        );
        break; // stop hammering while offline
      }
    }
    return sent;
  }

  Future<bool> _postReport(FieldReport r) async {
    // Supabase migration path — feature-flagged. When enabled AND a real
    // project is configured, the report is INSERTed into the `field_reports`
    // table (supabase/schema.sql) instead of the PocketBase articles REST API.
    // NOTE: the table's RLS requires Supabase Auth (reporter_id = auth.uid()),
    // so until phone/email sign-in is wired this path returns false on a live
    // project — it never throws and never fakes success.
    if (ReporterConfig.supabaseConfigured) {
      try {
        await SupabaseClientHolder.ensureInitialized();
        final client = SupabaseClientHolder.client;
        if (client == null) return false;
        await client.from('field_reports').insert({
          'title': r.title,
          'description': r.body,
          'location': r.placeLabel ?? r.locationTag,
          'lat': r.lat,
          'lng': r.lng,
          'captured_at': r.capturedAt.toUtc().toIso8601String(),
          'media_urls': r.mediaPath == null ? const [] : [r.mediaPath!],
          // status defaults to 'draft' server-side; reporter_id is taken from
          // the authenticated Supabase session by the RLS policy.
        }).timeout(const Duration(seconds: 15));
        return true;
      } catch (_) {
        return false; // offline / RLS-denied / misconfigured → stays queued
      }
    }

    // Legacy PocketBase-style REST path (unchanged) — POSTs the field report
    // JSON to the articles collection, then media is attached by slug by the
    // backend ingest hook. NOTE: file/media multipart upload is intentionally
    // separate — a field report JSON record is created first, then media is
    // attached by slug by the backend ingest hook. Media multipart is
    // documented in the service adapters; on a fully wired build this method
    // POSTs to
    //   POST $apiBase/api/collections/field_reports/records
    // with the PocketBase auth token (staff) or public create token (citizen).
    try {
      final res = await http
          .post(
            Uri.parse(ReporterConfig.submitEndpoint),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'title_bn': r.title,
              'body_bn': r.body,
              'dek_bn': 'ফিল্ড রিপোর্ট · ${r.locationTag}',
              'category': r.category,
              'tags': ['field-report', r.role.code],
              'author': r.sourceName,
              'status': r.role.needsEditorApproval ? 'pending' : 'pending',
              'source_title': r.role.isStaff ? 'staff-field' : 'citizen-field',
              'source_url': r.mediaPath,
              'is_breaking': 0,
              'bias_index_score': 50,
              'reading_time_min': 1,
              'seo_title': r.title,
              'seo_description':
                  '${r.category} · ${r.placeLabel ?? r.locationTag}',
            }),
          )
          .timeout(const Duration(seconds: 15));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    super.dispose();
  }
}
