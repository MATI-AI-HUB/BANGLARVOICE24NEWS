import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models/channel.dart';
import '../models/schedule.dart';
import '../models/stream.dart';

class TvApiService {
  TvApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;
  static const _timeout = Duration(seconds: 8);

  Future<StreamInfo> fetchStream() async {
    try {
      final res = await _client
          .get(Uri.parse(TvConfig.streamUrl))
          .timeout(_timeout);
      if (res.statusCode != 200) return StreamInfo.empty;
      final json = jsonDecode(utf8.decode(res.bodyBytes));
      if (json is! Map<String, dynamic>) return StreamInfo.empty;
      return StreamInfo.fromJson(json);
    } catch (_) {
      return StreamInfo.empty;
    }
  }

  Future<List<ScheduleEntry>> fetchSchedule() async {
    try {
      final res = await _client
          .get(Uri.parse(TvConfig.scheduleUrl))
          .timeout(_timeout);
      if (res.statusCode != 200) return ScheduleEntry.fallback;
      final json = jsonDecode(utf8.decode(res.bodyBytes));
      final entries = json is Map ? json['entries'] : json;
      if (entries is! List) return ScheduleEntry.fallback;
      final list = entries
          .whereType<Map<String, dynamic>>()
          .map(ScheduleEntry.fromJson)
          .toList();
      return list.isEmpty ? ScheduleEntry.fallback : list;
    } catch (_) {
      return ScheduleEntry.fallback;
    }
  }

  Future<List<TvChannel>> fetchChannels() async {
    try {
      final res = await _client
          .get(Uri.parse(TvConfig.channelsUrl))
          .timeout(_timeout);
      if (res.statusCode != 200) return TvChannel.fallback;
      final json = jsonDecode(utf8.decode(res.bodyBytes));
      final list = json is Map ? json['channels'] : json;
      if (list is! List) return TvChannel.fallback;
      final channels = list
          .whereType<Map<String, dynamic>>()
          .map(TvChannel.fromJson)
          .toList();
      return channels.isEmpty ? TvChannel.fallback : channels;
    } catch (_) {
      return TvChannel.fallback;
    }
  }
}
