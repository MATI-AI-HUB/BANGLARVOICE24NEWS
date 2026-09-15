import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/dashboard_stats.dart';
import '../models/pending_article.dart';
import '../models/reporter.dart';
import 'admin_session.dart';

class AdminApi {
  AdminApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  static const _timeout = Duration(seconds: 15);

  Map<String, String> get _headers {
    final t = AdminSession.token;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (t != null && t.isNotEmpty) 'Authorization': 'Bearer $t',
    };
  }

  Future<DashboardStats> fetchStats() async {
    try {
      final res = await _client
          .get(AdminConfig.uri(AdminConfig.statsPath), headers: _headers)
          .timeout(_timeout);
      if (res.statusCode != 200) return DashboardStats.empty;
      return DashboardStats.fromJson(
        jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>,
      );
    } catch (_) {
      return DashboardStats.empty;
    }
  }

  Future<List<PendingArticle>> fetchPending() async {
    try {
      final res = await _client
          .get(AdminConfig.uri(AdminConfig.pendingPath), headers: _headers)
          .timeout(_timeout);
      if (res.statusCode != 200) return [];
      final json = jsonDecode(utf8.decode(res.bodyBytes));
      final items = json is Map ? json['items'] : json;
      if (items is! List) return [];
      return items
          .whereType<Map<String, dynamic>>()
          .map(PendingArticle.fromJson)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<List<Reporter>> fetchReporters() async {
    try {
      final res = await _client
          .get(AdminConfig.uri(AdminConfig.reportersPath), headers: _headers)
          .timeout(_timeout);
      if (res.statusCode != 200) return [];
      final json = jsonDecode(utf8.decode(res.bodyBytes));
      final items = json is Map ? json['reporters'] : json;
      if (items is! List) return [];
      return items
          .whereType<Map<String, dynamic>>()
          .map(Reporter.fromJson)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<bool> approve(String id, {String note = ''}) async {
    return _postJson(AdminConfig.approvePath, {'id': id, 'note': note});
  }

  Future<bool> reject(String id, {String reason = ''}) async {
    return _postJson(AdminConfig.rejectPath, {'id': id, 'reason': reason});
  }

  Future<bool> setBreaking({required bool active, String text = ''}) async {
    return _postJson(AdminConfig.breakingPath, {'active': active, 'text': text});
  }

  Future<bool> _postJson(String path, Map<String, dynamic> body) async {
    try {
      final res = await _client
          .post(
            AdminConfig.uri(path),
            headers: _headers,
            body: jsonEncode(body),
          )
          .timeout(_timeout);
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }
}
