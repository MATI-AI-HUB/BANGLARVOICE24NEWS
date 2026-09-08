// =============================================================================
// getApiKey — client helper (Next.js server-side + Flutter equivalent below)
// -----------------------------------------------------------------------------
// All 3 Flutter apps + the admin console MUST call this edge function to fetch
// third-party keys at runtime. NEVER put OPENAI_API_KEY / etc. in a frontend
// build. Rotating a key in the admin console then requires NO app rebuild.
// =============================================================================

import { supabase } from "./supabase"; // see breaking-ticker.ts for the client

export type VaultKey = {
  service_name: string;
  environment: "prod" | "staging";
  key: string;
  usage_percent: number;
};

// Next.js (server-only! never call from a browser bundle)
export async function fetchVaultKey(
  serviceName: string,
  environment: "prod" | "staging" = "prod",
): Promise<VaultKey | null> {
  const { data, error } = await supabase.functions.invoke("getApiKey", {
    body: { service_name: serviceName, environment },
  });
  if (error) {
    console.error(`getApiKey(${serviceName}) failed:`, error.message);
    return null;
  }
  return data as VaultKey;
}

// ---- Flutter (Dart) equivalent — lib/services/vault_service.dart --------------
/*
import 'package:supabase_flutter/supabase_flutter.dart';

class VaultService {
  /// Call before using any AI / push / TTS feature.
  /// Returns the plaintext key or null when not configured.
  static Future<String?> getApiKey(String serviceName,
      {String environment = 'prod'}) async {
    final res = await Supabase.instance.client.functions.invoke(
      'getApiKey',
      body: {'service_name': serviceName, 'environment': environment},
    );
    final data = res.data as Map<String, dynamic>?;
    if (res.status != 200 || data == null) return null;
    return data['key'] as String?;
  }

  /// Example: reader app audio mode (DW-style TTS) fetches its ElevenLabs key:
  // final elevenLabsKey = await VaultService.getApiKey('ELEVENLABS_API_KEY');
}
*/
