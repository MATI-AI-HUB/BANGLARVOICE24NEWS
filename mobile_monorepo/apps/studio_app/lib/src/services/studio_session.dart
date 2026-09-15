/// Studio session — real Supabase auth for the Breaking Live Studio.
library;

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

enum StudioRole { director, editor, reporter }

extension StudioRoleX on StudioRole {
  String get code => switch (this) {
        StudioRole.director => 'director',
        StudioRole.editor => 'editor',
        StudioRole.reporter => 'reporter',
      };

  String get label => switch (this) {
        StudioRole.director => 'নিউজ ডিরেক্টর',
        StudioRole.editor => 'এডিটর',
        StudioRole.reporter => 'রিপোর্টার',
      };

  bool get defaultLivePermission => this == StudioRole.director;
}

class StudioSession {
  final String userId;
  final String email;
  final String token;
  final String name;
  final String phone;
  final StudioRole role;
  final bool livePermission;
  final String? desk;

  const StudioSession({
    required this.userId,
    required this.email,
    required this.token,
    required this.name,
    required this.phone,
    required this.role,
    this.livePermission = false,
    this.desk,
  });

  bool get canGoLive => livePermission;

  factory StudioSession.demo() => const StudioSession(
        userId: 'demo',
        email: 'demo@bv.local',
        token: 'demo',
        name: 'প্রিভিউ অপারেটর',
        phone: 'demo',
        role: StudioRole.director,
        livePermission: true,
        desk: 'লাইভ ডেস্ক',
      );
}

class StudioSessionStore {
  StudioSessionStore._();

  static const _kUserId = 'studio_user_id';
  static const _kEmail = 'studio_email';
  static const _kToken = 'studio_token';
  static const _kName = 'studio_name';
  static const _kPhone = 'studio_phone';
  static const _kRole = 'studio_role';
  static const _kLive = 'studio_live_permission';
  static const _kDesk = 'studio_desk';

  static StudioSession? _current;
  static StudioSession? get current => _current;

  static Future<void> load() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final userId = sp.getString(_kUserId);
      final email = sp.getString(_kEmail);
      final token = sp.getString(_kToken);
      final name = sp.getString(_kName);
      if (userId == null || email == null || token == null || name == null) {
        _current = null;
        return;
      }
      _current = StudioSession(
        userId: userId,
        email: email,
        token: token,
        name: name,
        phone: sp.getString(_kPhone) ?? '',
        role: _roleFromCode(sp.getString(_kRole)),
        livePermission: sp.getBool(_kLive) ?? false,
        desk: sp.getString(_kDesk),
      );
    } catch (_) {
      _current = null;
    }
  }

  static StudioRole _roleFromCode(String? c) => switch (c) {
        'director' => StudioRole.director,
        'editor' => StudioRole.editor,
        _ => StudioRole.reporter,
      };

  /// Login via Supabase. Returns null on success, error message on failure.
  static Future<String?> login(String email, String password) async {
    try {
      final url = Uri.parse(
        '${StudioConfig.supabaseUrl}/auth/v1/token?grant_type=password',
      );
      final res = await http.post(
        url,
        headers: {
          'apikey': StudioConfig.supabaseAnonKey,
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
        '${StudioConfig.supabaseUrl}/rest/v1/profiles?select=role,full_name,phone,verified&id=eq.$userId',
      );
      final profileRes = await http.get(
        profileUrl,
        headers: {
          'apikey': StudioConfig.supabaseAnonKey,
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      String appRole = 'citizen_reporter';
      String fullName = (user['email'] as String?)?.split('@').first ?? 'অপারেটর';
      String phone = '';
      bool verified = false;

      if (profileRes.statusCode == 200) {
        final list = jsonDecode(profileRes.body) as List;
        if (list.isNotEmpty) {
          final p = list.first as Map<String, dynamic>;
          appRole = (p['role'] as String?) ?? 'citizen_reporter';
          fullName = (p['full_name'] as String?) ?? fullName;
          phone = (p['phone'] as String?) ?? '';
          verified = p['verified'] == true;
        }
      }

      // Map Supabase role to Studio role
      final (studioRole, livePermission) = switch (appRole) {
        'admin' || 'chief_editor' || 'desk_editor' => (StudioRole.director, true),
        'staff_reporter' => (StudioRole.editor, false),
        _ => (StudioRole.reporter, false),
      };

      // Only allow studio access for admin/editorial roles
      const allowed = ['admin', 'chief_editor', 'desk_editor', 'staff_reporter'];
      if (!allowed.contains(appRole)) {
        return 'স্টুডিওতে প্রবেশের অনুমতি নেই (রোল: $appRole)';
      }

      _current = StudioSession(
        userId: userId,
        email: email,
        token: token,
        name: fullName,
        phone: phone,
        role: studioRole,
        livePermission: livePermission,
      );

      final sp = await SharedPreferences.getInstance();
      await sp.setString(_kUserId, userId);
      await sp.setString(_kEmail, email);
      await sp.setString(_kToken, token);
      await sp.setString(_kName, fullName);
      await sp.setString(_kPhone, phone);
      await sp.setString(_kRole, studioRole.code);
      await sp.setBool(_kLive, livePermission);
      await sp.setBool('studio_verified', verified);
      return null;
    } catch (e) {
      return 'নেটওয়ার্ক সমস্যা: $e';
    }
  }

  static Future<void> clear() async {
    _current = null;
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_kUserId);
    await sp.remove(_kEmail);
    await sp.remove(_kToken);
    await sp.remove(_kName);
    await sp.remove(_kPhone);
    await sp.remove(_kRole);
    await sp.remove(_kLive);
    await sp.remove(_kDesk);
  }
}
