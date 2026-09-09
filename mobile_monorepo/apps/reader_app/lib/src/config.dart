import 'package:shared_preferences/shared_preferences.dart';

/// Banglar Voice — app configuration.
///
/// The API base URL is runtime-configurable: the user can override the
/// production default from Settings → সার্ভার (persisted via
/// [SharedPreferences]) so the app keeps working even while the public domain
/// is unreachable (e.g. DNS not live yet). A compile-time default can also be
/// injected with:
///   flutter build apk --release --dart-define=API_BASE=https://example.com
class AppConfig {
  AppConfig._();

  /// Production web origin (see web app src/lib/site.ts -> SITE.url).
  static const String defaultApiBase = 'https://banglarvoice24news.com';

  /// Compile-time override, e.g. --dart-define=API_BASE=http://10.0.2.2:8090
  static const String _definedBase = String.fromEnvironment('API_BASE');

  /// Persisted override key in SharedPreferences.
  static const String _prefsKey = 'api_base_url';

  /// Currently active base URL. Defaults to compile-time override, then the
  /// production origin, then any user override from [AppSettings.load].
  static String currentBase = _definedBase.isNotEmpty
      ? _definedBase
      : defaultApiBase;

  /// JSON Feed v1.1 endpoint — used by the "Latest" tab.
  static const String feedPath = '/api/public/feed.json';

  /// Optional live-blog JSON endpoint (add on the web app to activate).
  static const String livePath = '/api/public/live.json';

  /// Optional video JSON endpoint (add on the web app to activate).
  static const String videoPath = '/api/public/videos.json';

  static const String appNameBn = 'বাংলার ভয়েস';
  static const String appNameEn = 'Banglar Voice';
  static const String tagline = 'সত্য প্রকাশে নির্ভীক';

  static String get feedUrl => '${_trim(currentBase)}$feedPath';
  static String get liveUrl => '${_trim(currentBase)}$livePath';
  static String get videoUrl => '${_trim(currentBase)}$videoPath';

  static String _trim(String base) =>
      base.endsWith('/') ? base.substring(0, base.length - 1) : base;

  /// Normalizes a user-entered base URL: adds https:// when no scheme,
  /// strips trailing slashes. Returns null when input looks invalid.
  static String? normalizeBase(String raw) {
    var value = raw.trim();
    if (value.isEmpty) return null;
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      value = 'https://$value';
    }
    final uri = Uri.tryParse(value);
    if (uri == null || (uri.host.isEmpty)) return null;
    value = _trim(value);
    return value;
  }
}

/// Small settings facade that persists user preferences.
class AppSettings {
  AppSettings._();

  /// Loads persisted API base override (called once at startup).
  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(AppConfig._prefsKey);
      if (saved != null && saved.isNotEmpty) {
        final normalized = AppConfig.normalizeBase(saved);
        if (normalized != null) AppConfig.currentBase = normalized;
      }
    } catch (_) {
      // SharedPreferences failure must never crash startup.
    }
  }

  /// Persists a new API base URL. Returns true on success.
  static Future<bool> setApiBase(String raw) async {
    final normalized = AppConfig.normalizeBase(raw);
    if (normalized == null) return false;
    AppConfig.currentBase = normalized;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConfig._prefsKey, normalized);
    } catch (_) {
      // Keep in-memory value even if persistence fails.
    }
    return true;
  }

  /// Clears the override so the app falls back to the production default.
  static Future<void> resetApiBase() async {
    AppConfig.currentBase = AppConfig._definedBase.isNotEmpty
        ? AppConfig._definedBase
        : AppConfig.defaultApiBase;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(AppConfig._prefsKey);
    } catch (_) {}
  }

  /// True when the current base differs from the production default.
  static bool get isOverridden =>
      AppConfig.currentBase != AppConfig.defaultApiBase;
}
