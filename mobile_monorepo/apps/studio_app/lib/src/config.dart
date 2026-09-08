/// Banglar Voice Breaking Live Studio — configuration & API-Vault read points.
///
/// Everything switchable lives here so a build can be pointed at a real
/// LiveKit / RTMP / Mux / Cloudflare stack (or the Admin Console API Vault)
/// without touching UI code. Empty values are the *graceful fallback*: the UI
/// shows "কী নেই — API Vault থেকে আসবে" instead of attempting a fake stream.
library;

import 'package:bv_shared/bv_api.dart';

class StudioConfig {
  StudioConfig._();

  /// PocketBase REST base (shared client used by all Banglar Voice apps).
  static const String apiBase = BvApi.base;

  /// Brand colors — #CC0000 red, #0A1931 deep blue.
  static const int brandRed = 0xFFCC0000;
  static const int deepBlue = 0xFF0A1931;

  // ---------------------------------------------------------------------------
  // Live infrastructure (set at build time or fetched from the API Vault).
  // The Admin Console (`admin-console/` in the repo) owns the central API Vault;
  // keys there can rotate WITHOUT an app update. Until a vault service is
  // reachable every key below stays '' and the app runs in UI-preview mode.
  // ---------------------------------------------------------------------------

  /// LiveKit token/room endpoint. Needs a LiveKit server + URL before guests
  /// (2-person live) can actually join.
  static const String liveKitUrl =
      String.fromEnvironment('BV_LIVEKIT_URL', defaultValue: '');

  /// RTMP ingest base used to multi-stream to Facebook/YouTube, e.g.
  /// `rtmps://live-api-s.facebook.com:443/rtmp/`. The per-destination stream
  /// keys themselves come from the API Vault (YOUTUBE_DATA_API_KEY /
  /// FACEBOOK_GRAPH_TOKEN) so they are never baked into the APK.
  static const String rtmpIngestBase =
      String.fromEnvironment('BV_RTMP_INGEST', defaultValue: '');

  /// Mux.com token (transcoding + VOD save). Empty = not provisioned.
  static const String muxTokenId =
      String.fromEnvironment('BV_MUX_TOKEN_ID', defaultValue: '');

  /// Cloudflare Stream token (alternative transcoding). Empty = not provisioned.
  static const String cloudflareStreamToken =
      String.fromEnvironment('BV_CF_STREAM_TOKEN', defaultValue: '');

  /// End-live hook: backend AI auto-generates title, description, thumbnail and
  /// creates a Video article draft + VOD. Empty = no draft is created and the
  /// app shows an honest "preview" of what the AI pipeline will do.
  static const String endLiveDraftEndpoint =
      String.fromEnvironment('BV_AI_ENDLIVE_URL', defaultValue: '');

  /// AI live WebSocket: real-time Bangla burned-in subtitles, ticker text and
  /// sensitive-word warnings for the director. Empty = live audio is not sent
  /// anywhere (privacy-safe scaffold).
  static const String aiLiveWsUrl =
      String.fromEnvironment('BV_AI_LIVE_WS', defaultValue: '');

  /// AI auto-clip hook: 30-second "viral moment" clips pushed to the Shorts
  /// feed. Empty = clipping is documented only.
  static const String aiClipEndpoint =
      String.fromEnvironment('BV_AI_CLIP_URL', defaultValue: '');

  /// Default reporter location (Dhaka) shown on the "Reporter Location Map"
  /// placeholder until real GPS location service is wired.
  static const double defaultLat = 23.8103;
  static const double defaultLng = 90.4125;

  // --- derived UI helpers -----------------------------------------------------

  static bool get hasLiveKit => liveKitUrl.isNotEmpty;
  static bool get hasRtmpIngest => rtmpIngestBase.isNotEmpty;
  static bool get hasTranscoder => muxTokenId.isNotEmpty || cloudflareStreamToken.isNotEmpty;
  static bool get hasAiLive => aiLiveWsUrl.isNotEmpty;
  static bool get hasEndLiveDraft => endLiveDraftEndpoint.isNotEmpty;
  static bool get hasAiClip => aiClipEndpoint.isNotEmpty;
}
