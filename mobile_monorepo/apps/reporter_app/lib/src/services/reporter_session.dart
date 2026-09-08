/// Reporter session — who is logged in and their role/verification state.
/// Persisted with shared_preferences so the role survives app restarts.
library;

import 'package:shared_preferences/shared_preferences.dart';

import '../models.dart';

class ReporterSession {
  static const _kName = 'reporter_name';
  static const _kPhone = 'reporter_phone';
  static const _kRole = 'reporter_role';
  static const _kVerified = 'reporter_verified';
  static const _kDesk = 'reporter_desk';

  final String name;
  final String phone;
  final ReporterRole role;
  final bool verified;
  final String? desk; // staff desk e.g. "রাজনীতি ডেস্ক"

  const ReporterSession({
    required this.name,
    required this.phone,
    required this.role,
    this.verified = false,
    this.desk,
  });

  bool get canPublishDirectly => role.isStaff && verified;

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'role': role.code,
        'verified': verified,
        'desk': desk,
      };

  factory ReporterSession.fromJson(Map<String, dynamic> j) => ReporterSession(
        name: (j['name'] ?? '').toString(),
        phone: (j['phone'] ?? '').toString(),
        role: (j['role'] ?? 'citizen').toString() == 'staff'
            ? ReporterRole.staff
            : ReporterRole.citizen,
        verified: j['verified'] == true,
        desk: j['desk']?.toString(),
      );
}

class SessionStore {
  SessionStore._();
  static ReporterSession? _current;

  static ReporterSession? get current => _current;

  static Future<void> load() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final name = sp.getString(ReporterSession._kName);
      if (name == null) {
        _current = null;
        return;
      }
      _current = ReporterSession(
        name: name,
        phone: sp.getString(ReporterSession._kPhone) ?? '',
        role: sp.getString(ReporterSession._kRole) == 'staff'
            ? ReporterRole.staff
            : ReporterRole.citizen,
        verified: sp.getBool(ReporterSession._kVerified) ?? false,
        desk: sp.getString(ReporterSession._kDesk),
      );
    } catch (_) {
      _current = null;
    }
  }

  static Future<void> save(ReporterSession session) async {
    _current = session;
    try {
      final sp = await SharedPreferences.getInstance();
      await sp.setString(ReporterSession._kName, session.name);
      await sp.setString(ReporterSession._kPhone, session.phone);
      await sp.setString(ReporterSession._kRole, session.role.code);
      await sp.setBool(ReporterSession._kVerified, session.verified);
      if (session.desk != null) {
        await sp.setString(ReporterSession._kDesk, session.desk!);
      } else {
        await sp.remove(ReporterSession._kDesk);
      }
    } catch (_) {
      // In-memory session still valid; persistence best-effort.
    }
  }

  static Future<void> clear() async {
    _current = null;
    try {
      final sp = await SharedPreferences.getInstance();
      await sp.remove(ReporterSession._kName);
      await sp.remove(ReporterSession._kPhone);
      await sp.remove(ReporterSession._kRole);
      await sp.remove(ReporterSession._kVerified);
      await sp.remove(ReporterSession._kDesk);
    } catch (_) {}
  }
}
