/// Supabase client bootstrap for the Field Reporter app.
///
/// Migration target: the app historically POSTs field reports to the
/// PocketBase-style REST endpoint (ReporterConfig.submitEndpoint). This file
/// wires a Supabase client that can be enabled side-by-side via the
/// `ReporterConfig.useSupabase` feature flag WITHOUT removing the PocketBase
/// path. Until a live Supabase project URL + anon key are supplied at build
/// time the client stays uninitialized and every call degrades gracefully
/// (returns false / null) — the app keeps working offline-first.
///
/// Build-time injection (same convention as bv_shared / ReporterConfig):
///   flutter build apk --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
///                     --dart-define=SUPABASE_ANON_KEY=eyJ...
library;

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../src/config.dart';

/// Singleton holder so any service (OfflineQueue, realtime listener, future
/// auth wiring) shares ONE Supabase client.
class SupabaseClientHolder {
  SupabaseClientHolder._();

  static SupabaseClient? _client;

  /// Whether a real project URL + anon key were provided at build time.
  static bool get isConfigured =>
      ReporterConfig.supabaseUrl.isNotEmpty &&
      ReporterConfig.supabaseAnonKey.isNotEmpty &&
      !ReporterConfig.supabaseUrl.contains('YOUR-PROJECT-REF');

  /// Lazily initializes Supabase. Safe to call repeatedly — only initializes
  /// once; throws nothing when env is absent (callers check [isConfigured]).
  static Future<void> ensureInitialized() async {
    if (_client != null) return;
    if (!isConfigured) return; // no keys → stay uninitialized, caller falls back
    await Supabase.initialize(
      url: ReporterConfig.supabaseUrl,
      publishableKey: ReporterConfig.supabaseAnonKey,
    );
    _client = Supabase.instance.client;
  }

  /// The shared client, or null when not configured/initialized.
  static SupabaseClient? get client => _client;

  /// Test hook — never call from production code.
  @visibleForTesting
  static void overrideForTest(SupabaseClient? c) => _client = c;
}
