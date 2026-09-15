/// Banglar Voice Field Reporter — app configuration.
library;

import 'package:bv_shared/bv_api.dart';

class ReporterConfig {
  ReporterConfig._();

  static const String apiBase = BvApi.base;
  static const int brandRedValue = 0xFFCC0000;
  static const int deepBlueValue = 0xFF0A1931;

  static String get submitEndpoint => '$apiBase/api/collections/articles/records';

  // ─── Supabase (primary path) ───
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://iqdpuedsykjicquvnmii.supabase.co',
  );
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZHB1ZWRzeWtqaWNxdXZubWlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDkzNzMsImV4cCI6MjEwNDg4NTM3M30.HAu0axyxFgX8ADclCHoT50F_XwKX8F9GrFvTjJ5P7t8',
  );

  /// Supabase is now the primary path.
  static const bool useSupabase = true;

  static bool get supabaseConfigured =>
      useSupabase &&
      supabaseUrl.isNotEmpty &&
      supabaseAnonKey.isNotEmpty &&
      !supabaseUrl.contains('YOUR-PROJECT-REF');

  static const String aiProcessReportEndpoint = String.fromEnvironment('BV_AI_PROCESS_URL');
  static bool get aiEnabled => aiProcessReportEndpoint.isNotEmpty;

  static const String liveYouTubeId = String.fromEnvironment(
    'BV_LIVE_YOUTUBE_ID',
    defaultValue: '',
  );

  static const bool forceOffline = false;
}
