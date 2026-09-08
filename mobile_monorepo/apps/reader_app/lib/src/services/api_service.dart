import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../models.dart';

/// Typed result of a feed fetch, so screens can show distinct UI states:
/// fresh network data, cached (offline) data, or a hard failure.
class FeedResult {
  const FeedResult._(this.feed, {this.fromCache = false, this.attempts = 1});

  final Feed feed;
  final bool fromCache;
  final int attempts;

  bool get isFresh => !fromCache;
}

/// Thin client for the Banglar Voice public JSON endpoints.
///
/// Resilience features:
///  * bounded timeouts so the UI never hangs,
///  * exponential backoff with jitter (default 4 attempts),
///  * last-successful-response cache (SharedPreferences) served when the
///    network or the server is unreachable ("offline / cached" mode),
///  * typed [FetchException] with a user-friendly Bengali message.
class ApiService {
  ApiService({http.Client? client, String? baseOverride})
    : _client = client ?? http.Client(),
      _base = baseOverride ?? AppConfig.currentBase;

  final http.Client _client;
  final String _base;

  static const Duration _timeout = Duration(seconds: 10);
  static const int _maxAttempts = 4;
  static const String _cacheKeyPrefix = 'bv_cache_';

  final Random _rand = Random();

  Uri _uri(String path) => Uri.parse('${_trim(_base)}$path');

  static String _trim(String base) =>
      base.endsWith('/') ? base.substring(0, base.length - 1) : base;

  /// Fetches the JSON Feed with retry/backoff; falls back to cached payload.
  Future<FeedResult> fetchFeed({bool allowCache = true}) async {
    final cacheKey = _cacheKey(_base, AppConfig.feedPath);
    try {
      final body = await _getWithRetry(
        AppConfig.feedPath,
        accept: 'application/feed+json, application/json',
      );
      final feed = Feed.fromJson(jsonDecode(body) as Map<String, dynamic>);
      await _saveCache(cacheKey, body);
      return FeedResult._(feed);
    } on FetchException catch (e) {
      // Network/server failure — try the offline cache.
      if (allowCache) {
        final cached = await _loadCache(cacheKey);
        if (cached != null) {
          try {
            final feed = Feed.fromJson(
              jsonDecode(cached) as Map<String, dynamic>,
            );
            return FeedResult._(feed, fromCache: true, attempts: e.attempts);
          } catch (_) {
            // Corrupt cache — fall through to rethrow.
          }
        }
      }
      rethrow;
    }
  }

  /// Live-blog endpoint — may not exist yet on the backend; safe fallback to [].
  Future<List<LiveEntry>> fetchLive() async {
    try {
      final body = await _getWithRetry(
        AppConfig.livePath,
        accept: 'application/json',
      );
      await _saveCache(_cacheKey(_base, AppConfig.livePath), body);
      final decoded = jsonDecode(body);
      return _parseLiveList(decoded);
    } catch (e) {
      if (e is FetchException &&
          e.statusCode == null &&
          e.attempts >= _maxAttempts) {
        // Offline — serve cached live entries if any.
        final cached = await _loadCache(_cacheKey(_base, AppConfig.livePath));
        if (cached != null) {
          try {
            return _parseLiveList(jsonDecode(cached));
          } catch (_) {}
        }
      }
      return const [];
    }
  }

  /// Video endpoint — may not exist yet on the backend; safe fallback to [].
  Future<List<VideoItem>> fetchVideos() async {
    try {
      final body = await _getWithRetry(
        AppConfig.videoPath,
        accept: 'application/json',
      );
      await _saveCache(_cacheKey(_base, AppConfig.videoPath), body);
      final decoded = jsonDecode(body);
      return _parseVideoList(decoded);
    } catch (e) {
      if (e is FetchException &&
          e.statusCode == null &&
          e.attempts >= _maxAttempts) {
        final cached = await _loadCache(_cacheKey(_base, AppConfig.videoPath));
        if (cached != null) {
          try {
            return _parseVideoList(jsonDecode(cached));
          } catch (_) {}
        }
      }
      return const [];
    }
  }

  /// Quick health check used by the Settings "পরীক্ষা করুন" button.
  /// Returns a friendly status line, or throws [FetchException].
  Future<String> ping() async {
    final body = await _getWithRetry(
      AppConfig.feedPath,
      accept: 'application/feed+json, application/json',
    );
    final map = jsonDecode(body);
    final items = map is Map<String, dynamic>
        ? (map['items'] as List? ?? [])
        : [];
    return 'সার্ভার সক্রিয় — ${items.length}টি সংবাদ পাওয়া গেছে';
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  Future<String> _getWithRetry(String path, {required String accept}) async {
    var attempt = 0;
    FetchException? last;
    while (attempt < _maxAttempts) {
      attempt++;
      try {
        final uri = _uri(path);
        final res = await _client
            .get(uri, headers: {'Accept': accept})
            .timeout(_timeout);
        if (res.statusCode == 200) {
          return utf8.decode(res.bodyBytes);
        }
        last = FetchException(
          'সার্ভার থেকে ${res.statusCode} উত্তর এসেছে',
          statusCode: res.statusCode,
          attempts: attempt,
        );
      } on TimeoutException {
        last = FetchException(
          'সার্ভার সাড়া দিতে অনেক সময় নিচ্ছে',
          attempts: attempt,
        );
      } catch (e) {
        last = FetchException(_friendlyNetworkMessage(e), attempts: attempt);
      }
      if (attempt < _maxAttempts) {
        await Future<void>.delayed(_backoffDelay(attempt));
      }
    }
    throw last ?? FetchException('অজানা ত্রুটি', attempts: _maxAttempts);
  }

  /// Exponential backoff with full jitter: base 800ms * 2^(attempt-1).
  Duration _backoffDelay(int attempt) {
    final maxMs = 800 * (1 << (attempt - 1)).clamp(1, 4);
    return Duration(milliseconds: _rand.nextInt(maxMs));
  }

  String _friendlyNetworkMessage(Object e) {
    final s = e.toString();
    if (s.contains('SocketException') ||
        s.contains('Connection refused') ||
        s.contains('Failed host lookup') ||
        s.contains('ClientException') ||
        s.contains('Connection closed')) {
      return 'সার্ভারে পৌঁছানো যাচ্ছে না — ইন্টারনেট বা সার্ভার চালু আছে কি না দেখুন';
    }
    return s.replaceAll('Exception:', '').trim();
  }

  static String _cacheKey(String base, String path) =>
      '$_cacheKeyPrefix${Uri.encodeComponent(base)}$path';

  Future<void> _saveCache(String key, String body) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, body);
    } catch (_) {}
  }

  Future<String?> _loadCache(String key) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(key);
    } catch (_) {
      return null;
    }
  }

  List<LiveEntry> _parseLiveList(dynamic decoded) {
    final list = decoded is Map<String, dynamic>
        ? (decoded['entries'] ?? decoded['items'] ?? [])
        : decoded;
    if (list is! List) return const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(LiveEntry.fromJson)
        .toList();
  }

  List<VideoItem> _parseVideoList(dynamic decoded) {
    final list = decoded is Map<String, dynamic>
        ? (decoded['videos'] ?? decoded['items'] ?? [])
        : decoded;
    if (list is! List) return const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(VideoItem.fromJson)
        .toList();
  }
}

class FetchException implements Exception {
  FetchException(this.message, {this.statusCode, this.attempts = 1});

  final String message;

  /// HTTP status when the server answered; null for network-level failures.
  final int? statusCode;
  final int attempts;

  @override
  String toString() => message;
}
