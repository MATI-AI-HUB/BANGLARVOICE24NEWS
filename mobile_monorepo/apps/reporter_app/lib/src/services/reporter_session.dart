/// Reporter session — real Supabase auth for the Field Reporter app.
library;

import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';
import '../models.dart';

class ReporterSession {
  static const _kUserId = 'reporter_user_id';
  static const _kEmail = 'reporter_email';
  static const _kToken = 'reporter_token';
  static const _kName = 'reporter_name';
  static const _kPhone = 'reporter_phone';
  static const _kRole = 'reporter_role';
  static const _kVerified = 'reporter_verified';
  static const _kDesk = 'reporter_desk';

  final String userId;
  final String email;
  final String token;
  final String name;
  final String phone;
  final String roleCode;
  final bool verified;
  final String? desk;

  const ReporterSession({
    required this.userId,
    required this.email,
    required this.token,
    required this.name,
    required this.phone,
    required this.roleCode,
    this.verified = false,
    this.desk,
  });

  bool get isStaff =>
      roleCode == 'staff_reporter' ||
      roleCode == 'desk_editor' ||
      roleCode == 'chief_editor';
  bool get canPublishDirectly => isStaff && verified;

  /// Backward-compat getter for screens that expect a ReporterRole enum.
  ReporterRole get role => isStaff ? ReporterRole.staff : ReporterRole.citizen;

  /// Backward-compat getter for screens that expect a ReporterRole enum.
  ReporterRole get role => isStaff ? ReporterRole.staff : ReporterRole.citizen;
}

class SessionStore {
  SessionStore._();

  static ReporterSession? _current;
  static String? _token;
  static String? _email;
  static String? _userId;

  static ReporterSession? get current => _current;
  static String? get token => _token;
  static String? get email => _email;
  static String? get userId => _userId;

  static Future<void> load() async {
    try {
      final sp = await SharedPreferences.getInstance();
      _email = sp.getString(ReporterSession._kEmail);
      _token = sp.getString(ReporterSession._kToken);
      _userId = sp.getString(ReporterSession._kUserId);
      final name = sp.getString(ReporterSession._kName);
      if (_email == null || _token == null || _userId == null || name == null) {
        _current = null;
        return;
      }
      _current = ReporterSession(
        userId: _userId!,
        email: _email!,
        token: _token!,
        name: name,
        phone: sp.getString(ReporterSession._kPhone) ?? '',
        roleCode: sp.getString(ReporterSession._kRole) ?? 'citizen_reporter',
        verified: sp.getBool(ReporterSession._kVerified) ?? false,
        desk: sp.getString(ReporterSession._kDesk),
      );
    } catch (_) {
      _current = null;
    }
  }

  /// Login via Supabase. Returns null on success, error message on failure.
  static Future<String?> login(String email, String password) async {
    try {
      final url = Uri.parse(
        '${ReporterConfig.supabaseUrl}/auth/v1/token?grant_type=password',
      );
      final res = await http.post(
        url,
        headers: {
          'apikey': ReporterConfig.supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (res.statusCode != 200) return 'ভুল ইমেইল বা পাসওয়ার্ড';

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final token = data['access_token'] as String?;
      final user = data['user'] as Map<String, dynamic>?;
      if (token == null || user == null) return 'লগইন ব্যর্থ';

      final userId = user['id'] as String?;
      if (userId == null) return 'ইউজার আইডি পাওয়া যায়নি';

      // Fetch profile
      final profileUrl = Uri.parse(
        '${ReporterConfig.supabaseUrl}/rest/v1/profiles?select=role,full_name,phone,verified&id=eq.$userId',
      );
      final profileRes = await http.get(
        profileUrl,
        headers: {
          'apikey': ReporterConfig.supabaseAnonKey,
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      String roleCode = 'citizen_reporter';
      String fullName = (user['email'] as String?)?.split('@').first ?? 'রিপোর্টার';
      String phone = '';
      bool verified = false;

      if (profileRes.statusCode == 200) {
        final list = jsonDecode(profileRes.body) as List;
        if (list.isNotEmpty) {
          final p = list.first as Map<String, dynamic>;
          roleCode = (p['role'] as String?) ?? 'citizen_reporter';
          fullName = (p['full_name'] as String?) ?? fullName;
          phone = (p['phone'] as String?) ?? '';
          verified = p['verified'] == true;
        }
      }

      // Save
      _userId = userId;
      _email = email;
      _token = token;
      _current = ReporterSession(
        userId: userId,
        email: email,
        token: token,
        name: fullName,
        phone: phone,
        roleCode: roleCode,
        verified: verified,
      );

      final sp = await SharedPreferences.getInstance();
      await sp.setString(ReporterSession._kUserId, userId);
      await sp.setString(ReporterSession._kEmail, email);
      await sp.setString(ReporterSession._kToken, token);
      await sp.setString(ReporterSession._kName, fullName);
      await sp.setString(ReporterSession._kPhone, phone);
      await sp.setString(ReporterSession._kRole, roleCode);
      await sp.setBool(ReporterSession._kVerified, verified);
      return null;
    } catch (e) {
      return 'নেটওয়ার্ক সমস্যা: $e';
    }
  }

  static Future<void> logout() async {
    _current = null;
    _token = null;
    _email = null;
    _userId = null;
    try {
      final sp = await SharedPreferences.getInstance();
      await sp.remove(ReporterSession._kUserId);
      await sp.remove(ReporterSession._kEmail);
      await sp.remove(ReporterSession._kToken);
      await sp.remove(ReporterSession._kName);
      await sp.remove(ReporterSession._kPhone);
      await sp.remove(ReporterSession._kRole);
      await sp.remove(ReporterSession._kVerified);
      await sp.remove(ReporterSession._kDesk);
    } catch (_) {}
  }
}
