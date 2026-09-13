import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

class AdminSession {
  AdminSession._();
  static bool _logged = false;
  static bool get isLogged => _logged;

  static Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _logged = prefs.getBool(AdminConfig.sessionKey) ?? false;
    } catch (_) {
      _logged = false;
    }
  }

  static Future<bool> login(String password) async {
    if (password != AdminConfig.adminPassword) return false;
    _logged = true;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(AdminConfig.sessionKey, true);
    } catch (_) {}
    return true;
  }

  static Future<void> logout() async {
    _logged = false;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(AdminConfig.sessionKey);
    } catch (_) {}
  }
}
