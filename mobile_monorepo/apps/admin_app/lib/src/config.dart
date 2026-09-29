/// Banglar Voice Admin — configuration.
library;

class AdminConfig {
  AdminConfig._();

  static const String defaultBase = 'https://banglarvoice24news.com';
  static const String _defined = String.fromEnvironment('API_BASE');
  static String currentBase = _defined.isNotEmpty ? _defined : defaultBase;

  // ─── Supabase (real auth for mobile) ───
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  // ─── Admin endpoints ───
  static const String statsPath = '/api/admin/stats';
  static const String pendingPath = '/api/admin/pending';
  static const String approvePath = '/api/admin/approve';
  static const String rejectPath = '/api/admin/reject';
  static const String reportersPath = '/api/admin/reporters';
  static const String breakingPath = '/api/admin/breaking';
  static const String healthPath = '/api/admin/health';

  static Uri uri(String path) => Uri.parse('$currentBase$path');

  // ─── Session storage keys ───
  static const String sessionKey = 'bv_admin_session';
  static const String emailKey = 'bv_admin_email';
  static const String tokenKey = 'bv_admin_token';

  static String trimBase(String b) =>
      b.endsWith('/') ? b.substring(0, b.length - 1) : b;

  static String? normalizeBase(String raw) {
    var v = raw.trim();
    if (v.isEmpty) return null;
    if (!v.startsWith('http://') && !v.startsWith('https://')) {
      v = 'https://$v';
    }
    final uri = Uri.tryParse(v);
    if (uri == null || uri.host.isEmpty) return null;
    return trimBase(v);
  }
}
