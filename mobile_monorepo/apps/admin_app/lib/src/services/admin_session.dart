import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

class AdminSession {
  AdminSession._();

  static bool _logged = false;
  static String? _email;
  static String? _token;

  static bool get isLogged => _logged;
  static String? get email => _email;
  static String? get token => _token;

  /// Load saved session on app start.
  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _email = prefs.getString(AdminConfig.emailKey);
      _token = prefs.getString(AdminConfig.tokenKey);
      _logged = _token != null && _token!.isNotEmpty;
    } catch (_) {
      _logged = false;
    }
  }

  /// Login via Supabase email + password. Returns true on success.
  static Future<bool> login(String email, String password) async {
    try {
      final url = Uri.parse(
        '${AdminConfig.supabaseUrl}/auth/v1/token?grant_type=password',
      );
      final res = await http.post(
        url,
        headers: {
          'apikey': AdminConfig.supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (res.statusCode != 200) return false;

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final token = data['access_token'] as String?;
      final user = data['user'] as Map<String, dynamic>?;
      if (token == null || user == null) return false;

      // Verify admin role via Supabase
      final profileUrl = Uri.parse(
        '${AdminConfig.supabaseUrl}/rest/v1/profiles?select=role&id=eq.${user['id']}',
      );
      final profileRes = await http.get(
        profileUrl,
        headers: {
          'apikey': AdminConfig.supabaseAnonKey,
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      if (profileRes.statusCode != 200) return false;

      final profiles = jsonDecode(profileRes.body) as List;
      if (profiles.isEmpty) return false;

      final role = profiles.first['role'] as String?;
      const allowed = ['admin', 'chief_editor', 'desk_editor'];
      if (role == null || !allowed.contains(role)) return false;

      _logged = true;
      _email = email;
      _token = token;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AdminConfig.emailKey, email);
      await prefs.setString(AdminConfig.tokenKey, token);
      await prefs.setBool(AdminConfig.sessionKey, true);
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<void> logout() async {
    _logged = false;
    _email = null;
    _token = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(AdminConfig.emailKey);
      await prefs.remove(AdminConfig.tokenKey);
      await prefs.remove(AdminConfig.sessionKey);
    } catch (_) {}
  }
}
