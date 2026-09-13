import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/live_session.dart';

/// Backend calls for creating/ending live sessions.
class LiveStreamService {
  LiveStreamService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  static const _timeout = Duration(seconds: 10);

  /// Generates a unique Agora channel name for this session.
  String generateChannel(String reporterName) {
    final r = Random().nextInt(1 << 32).toRadixString(16);
    final slug = reporterName
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]'), '')
        .substring(0, min(8, reporterName.length))
        .padRight(3, 'x');
    return 'bv-$slug-$r';
  }

  Future<LiveSession?> startSession({
    required String title,
    required String reporterName,
    required String channel,
  }) async {
    try {
      final res = await _client
          .post(
            ReporterConfig.liveStartUri(),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'title': title,
              'reporter_name': reporterName,
              'agora_channel': channel,
            }),
          )
          .timeout(_timeout);

      if (res.statusCode != 200 && res.statusCode != 201) return null;
      final json = jsonDecode(utf8.decode(res.bodyBytes));
      if (json is! Map<String, dynamic>) return null;
      return LiveSession.fromJson(json);
    } catch (_) {
      // Fallback: create local session even if backend offline
      return LiveSession(
        id: 'local-${DateTime.now().millisecondsSinceEpoch}',
        channel: channel,
        title: title,
        reporterName: reporterName,
        startedAt: DateTime.now(),
        status: 'live',
      );
    }
  }

  Future<int> fetchViewerCount(String sessionId) async {
    try {
      final res = await _client
          .get(ReporterConfig.liveStatsUri(sessionId))
          .timeout(_timeout);
      if (res.statusCode != 200) return 0;
      final json = jsonDecode(utf8.decode(res.bodyBytes));
      return (json['viewer_count'] as num?)?.toInt() ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<void> endSession(String sessionId) async {
    try {
      await _client
          .post(
            ReporterConfig.liveEndUri(),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'id': sessionId}),
          )
          .timeout(_timeout);
    } catch (_) {}
  }
}
