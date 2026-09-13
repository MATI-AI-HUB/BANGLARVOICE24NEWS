import 'package:shared_preferences/shared_preferences.dart';

/// Banglar Voice TV — app configuration.
class TvConfig {
  TvConfig._();

  /// Production web origin.
  static const String defaultBase = 'https://banglarvoice24news.com';

  /// Compile-time override: --dart-define=API_BASE=...
  static const String _defined = String.fromEnvironment('API_BASE');

  static const String _prefsKey = 'bv_tv_api_base';

  static String currentBase =
      _defined.isNotEmpty ? _defined : defaultBase;

  // ─── Endpoints ───
  static const String streamPath = '/api/public/stream.json';
  static const String schedulePath = '/api/public/schedule.json';
  static const String channelsPath = '/api/public/channels.json';

  static String get streamUrl => _join(currentBase, streamPath);
  static String get scheduleUrl => _join(currentBase, schedulePath);
  static String get channelsUrl => _join(currentBase, channelsPath);

  static String _join(String base, String path) {
    final b = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    return '$b$path';
  }

  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefsKey);
      if (saved != null && saved.isNotEmpty) {
        currentBase = saved;
      }
    } catch (_) {}
  }

  static Future<bool> setBase(String raw) async {
    var v = raw.trim();
    if (v.isEmpty) return false;
    if (!v.startsWith('http://') && !v.startsWith('https://')) {
      v = 'https://$v';
    }
    if (v.endsWith('/')) v = v.substring(0, v.length - 1);
    currentBase = v;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, v);
    } catch (_) {}
    return true;
  }
}
