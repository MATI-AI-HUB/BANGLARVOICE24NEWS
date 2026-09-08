/// Banglar Voice Field Reporter — app configuration.
///
/// All switchable knobs live here so a build can be pointed at a different
/// backend (or Supabase) without touching UI code.
library;

import 'package:bv_shared/bv_api.dart';

class ReporterConfig {
  ReporterConfig._();

  /// PocketBase REST base (compile-time override, same as bv_shared).
  static const String apiBase = BvApi.base;

  /// Primary brand red.
  static const ColorValue brandRed = ColorValue(0xFFCC0000);

  /// Deep navy used for dark sections / verified badges.
  static const ColorValue deepBlue = ColorValue(0xFF0A1931);

  /// Where field reports are POSTed by OfflineQueue when online.
  /// Points at the PocketBase articles REST API with an `articles` collection.
  static String get submitEndpoint => '$apiBase/api/collections/articles/records';

  // --- Supabase migration (feature-flagged) ---------------------------------
  // The app historically submits through the PocketBase-style REST endpoint
  // above. These knobs let a build flip to Supabase (supabase_flutter) without
  // removing the PocketBase path. Supply at build time:
  //   flutter build apk --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  /// Master switch: true → OfflineQueue posts via
  /// `supabase.from('field_reports').insert(...)`; false → existing
  /// [submitEndpoint] PocketBase REST path. Both clients may coexist; nothing
  /// is removed. Defaults to false until the live Supabase project is wired.
  static const bool useSupabase = false;

  /// Whether a real Supabase project is configured (non-empty, non-placeholder).
  static bool get supabaseConfigured =>
      useSupabase &&
      supabaseUrl.isNotEmpty &&
      supabaseAnonKey.isNotEmpty &&
      !supabaseUrl.contains('YOUR-PROJECT-REF');

  /// AI orchestration endpoint — expected contract documented in
  /// README_REPORTER.md. When empty the app falls back to local-only (no AI).
  static const String aiProcessReportEndpoint =
      String.fromEnvironment('BV_AI_PROCESS_URL');

  /// If set, the capture screen shows the AI helper buttons (transcribe /
  /// summarize) and calls [aiProcessReportEndpoint] on submit.
  static bool get aiEnabled => aiProcessReportEndpoint.isNotEmpty;

  /// Live YouTube stream used by the Live TV screen (privacy-enhanced embed).
  static const String liveYouTubeId =
      String.fromEnvironment('BV_LIVE_YOUTUBE_ID', defaultValue: '');

  /// Local-only mode: no network calls are attempted for submit when true.
  static const bool forceOffline = false;
}

/// Tiny const holder so [ReporterConfig] colors stay usable as const values.
class ColorValue {
  final int value;
  const ColorValue(this.value);
}