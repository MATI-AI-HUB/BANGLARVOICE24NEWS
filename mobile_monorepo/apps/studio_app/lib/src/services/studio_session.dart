/// Studio session — who is in the control room and whether they hold the
/// "Live Permission" role. Persisted with shared_preferences so the grant
/// survives app restarts. Modeled on reporter_app's reporter_session.dart.
///
/// The Live Permission grant is issued from the Editorial/Admin app; this
/// client only stores the granted role that the backend already verified.
library;

import 'package:shared_preferences/shared_preferences.dart';

/// Roles understood by the studio. Only sessions with [livePermission] == true
/// may reach the Go Live button.
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

  /// Directors are pre-granted Live Permission in the demo/dev gate; editors
  /// and reporters must be explicitly granted by the Editorial App.
  bool get defaultLivePermission => this == StudioRole.director;
}

class StudioSession {
  final String name;
  final String phone;
  final StudioRole role;
  final bool livePermission;
  final String? desk;

  const StudioSession({
    required this.name,
    required this.phone,
    required this.role,
    this.livePermission = false,
    this.desk,
  });

  /// Security rule: Go Live is only visible with the granted role.
  bool get canGoLive => livePermission;

  /// Honest UI-preview session (never creates a real stream). Used so the full
  /// studio flow can be demonstrated before LiveKit/backend are provisioned.
  factory StudioSession.demo() => const StudioSession(
        name: 'প্রিভিউ অপারেটর',
        phone: 'demo',
        role: StudioRole.director,
        livePermission: true,
        desk: 'লাইভ ডেস্ক',
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'phone': phone,
        'role': role.code,
        'live_permission': livePermission,
        'desk': desk,
      };

  factory StudioSession.fromJson(Map<String, dynamic> j) => StudioSession(
        name: (j['name'] ?? '').toString(),
        phone: (j['phone'] ?? '').toString(),
        role: _roleFromCode((j['role'] ?? 'reporter').toString()),
        livePermission: j['live_permission'] == true,
        desk: j['desk']?.toString(),
      );

  static StudioRole _roleFromCode(String c) => switch (c) {
        'director' => StudioRole.director,
        'editor' => StudioRole.editor,
        _ => StudioRole.reporter,
      };
}

class StudioSessionStore {
  StudioSessionStore._();

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
      final name = sp.getString(_kName);
      if (name == null || name.isEmpty) {
        _current = null;
        return;
      }
      _current = StudioSession(
        name: name,
        phone: sp.getString(_kPhone) ?? '',
        role: sp.getString(_kRole) == 'director'
            ? StudioRole.director
            : sp.getString(_kRole) == 'editor'
                ? StudioRole.editor
                : StudioRole.reporter,
        livePermission: sp.getBool(_kLive) ?? false,
        desk: sp.getString(_kDesk),
      );
    } catch (_) {
      _current = null;
    }
  }

  static Future<void> save({
    required String name,
    required String phone,
    required StudioRole role,
    required bool livePermission,
    String? desk,
  }) async {
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_kName, name.trim().isEmpty ? 'অপারেটর' : name.trim());
    await sp.setString(_kPhone, phone);
    await sp.setString(_kRole, role.code);
    await sp.setBool(_kLive, livePermission);
    if (desk != null && desk.isNotEmpty) await sp.setString(_kDesk, desk);
    _current = StudioSession(
      name: name.trim().isEmpty ? 'অপারেটর' : name.trim(),
      phone: phone,
      role: role,
      livePermission: livePermission,
      desk: desk,
    );
  }

  static Future<void> clear() async {
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_kName);
    await sp.remove(_kPhone);
    await sp.remove(_kRole);
    await sp.remove(_kLive);
    await sp.remove(_kDesk);
    _current = null;
  }
}
