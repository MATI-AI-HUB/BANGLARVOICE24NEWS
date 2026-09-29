/// Banglar Voice Breaking Live Studio — configuration & API-Vault read points.
library;

import 'package:bv_shared/bv_api.dart';

class StudioConfig {
  StudioConfig._();

  static const String apiBase = BvApi.base;
  static const int brandRed = 0xFFCC0000;
  static const int deepBlue = 0xFF0A1931;

  // ─── Supabase (real auth for mobile) ───
  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  // ─── Live infrastructure (unchanged) ───
  static const String liveKitUrl = String.fromEnvironment('BV_LIVEKIT_URL', defaultValue: '');
  static const String rtmpIngestBase = String.fromEnvironment('BV_RTMP_INGEST', defaultValue: '');
  static const String muxTokenId = String.fromEnvironment('BV_MUX_TOKEN_ID', defaultValue: '');
  static const String cloudflareStreamToken = String.fromEnvironment('BV_CF_STREAM_TOKEN', defaultValue: '');
  static const String endLiveDraftEndpoint = String.fromEnvironment('BV_AI_ENDLIVE_URL', defaultValue: '');
  static const String aiLiveWsUrl = String.fromEnvironment('BV_AI_LIVE_WS', defaultValue: '');
  static const String aiClipEndpoint = String.fromEnvironment('BV_AI_CLIP_URL', defaultValue: '');

  static const double defaultLat = 23.8103;
  static const double defaultLng = 90.4125;

  static bool get hasLiveKit => liveKitUrl.isNotEmpty;
  static bool get hasRtmpIngest => rtmpIngestBase.isNotEmpty;
  static bool get hasTranscoder => muxTokenId.isNotEmpty || cloudflareStreamToken.isNotEmpty;
  static bool get hasAiLive => aiLiveWsUrl.isNotEmpty;
  static bool get hasEndLiveDraft => endLiveDraftEndpoint.isNotEmpty;
  static bool get hasAiClip => aiClipEndpoint.isNotEmpty;
}
