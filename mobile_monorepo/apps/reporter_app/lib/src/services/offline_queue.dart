/// Offline-first report queue with Supabase submission.
/// Schema-aware: matches the actual `field_reports` table columns.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../models.dart';
import 'reporter_session.dart';

typedef ConnectivityProbe = Future<bool> Function();

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
          list.map((e) => FieldReport.fromJson(e as Map<String, dynamic>)).toList(),
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
        break;
      }
    }
    return sent;
  }

  /// POST to Supabase `field_reports`.
  Future<bool> _postReport(FieldReport r) async {
    if (!ReporterConfig.supabaseConfigured) return false;

    final token = SessionStore.token;
    final userId = SessionStore.userId;
    if (token == null || token.isEmpty || userId == null || userId.isEmpty) {
      debugPrint('[offline_queue] No auth token/userId — cannot submit');
      return false;
    }

    try {
      final url = Uri.parse(
        '${ReporterConfig.supabaseUrl}/rest/v1/field_reports',
      );

      final body = <String, dynamic>{
        'reporter_id': userId,
        'title': r.title,
        'description': r.body,
        'media_urls': r.mediaPath == null ? <String>[] : <String>[r.mediaPath!],
        'location': r.placeLabel ?? r.locationTag,
        if (r.lat != null) 'lat': r.lat,
        if (r.lng != null) 'lng': r.lng,
        'captured_at': r.capturedAt.toUtc().toIso8601String(),
        'status': 'pending_review',
      };

      final res = await http
          .post(
            url,
            headers: {
              'apikey': ReporterConfig.supabaseAnonKey,
              'Authorization': 'Bearer $token',
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return true;
      }
      debugPrint(
        '[offline_queue] Supabase reject: ${res.statusCode} ${res.body}',
      );
      return false;
    } catch (e) {
      debugPrint('[offline_queue] Supabase insert failed: $e');
      return false;
    }
  }
}
