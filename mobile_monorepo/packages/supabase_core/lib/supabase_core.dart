/// supabase_core — shared Supabase bootstrap for all Banglar Voice apps.
///
/// Modeled on reporter_app's per-app `SupabaseClientHolder` (commit 4159e4f) so
/// every app shares ONE pattern: lazy init from build-time dart-defines with a
/// graceful fallback when no live project is configured. Apps call
/// [initialize] once in `main()` before `runApp`, then use
/// [SupabaseCore.client] (nullable) and [SupabaseCore.realtimeChannel].
///
/// Build-time injection (same convention everywhere):
///   flutter build apk --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
///                     --dart-define=SUPABASE_ANON_KEY=eyJ...
library;

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Central shared config — every app reads the SAME env var names so all five
/// apps point at one Supabase project.
class SupabaseCore {
  SupabaseCore._();

  /// Real Supabase project URL, injected at build time.
  static const String url =
      String.fromEnvironment('SUPABASE_URL', defaultValue: '');

  /// Anon (publishable) key — safe for clients; RLS protects the rows.
  static const String anonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  static bool _initialized = false;
  static SupabaseClient? _client;

  /// Whether a real project URL + anon key were provided at build time.
  static bool get isConfigured =>
      url.isNotEmpty &&
      anonKey.isNotEmpty &&
      !url.contains('YOUR-PROJECT-REF') &&
      !anonKey.contains('YOUR-PROJECT-REF');

  /// Lazy, idempotent init. Never throws when env is absent — callers use
  /// [client] (null) and keep their offline/PocketBase path.
  static Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    if (!isConfigured) return; // no keys → stay uninitialized, caller falls back
    await Supabase.initialize(url: url, publishableKey: anonKey);
    _client = Supabase.instance.client;
  }

  /// The shared client, or null when not configured/initialized.
  static SupabaseClient? get client => _client;

  /// Creates (and subscribes) to a postgres_changes channel when Supabase is
  /// configured; returns null otherwise so callers can skip silently.
  /// Caller must keep the returned channel and remove it on dispose.
  static RealtimeChannel? realtimeChannel({
    required String name,
    required String table,
    void Function()? onEvent,
    void Function(PostgresChangePayload payload)? onPayload,
  }) {
    final c = _client;
    if (c == null) return null;
    return c
        .channel(name)
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: table,
          callback: (payload) {
            if (onPayload != null) {
              onPayload(payload);
            } else {
              onEvent?.call();
            }
          },
        )
        .subscribe();
  }

  static Future<void> removeChannel(RealtimeChannel? channel) async {
    final c = _client;
    if (c == null || channel == null) return;
    await c.removeChannel(channel);
  }

  /// Test hook — never call from production code.
  @visibleForTesting
  static void overrideForTest(SupabaseClient? c) => _client = c;
}
