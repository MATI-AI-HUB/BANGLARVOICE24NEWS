// =============================================================================
// getApiKey — client helper (Next.js server-side + Flutter equivalent below)
// -----------------------------------------------------------------------------
// Clients may call this edge function for readiness metadata, but it never
// returns third-party plaintext keys. Provider calls stay server-side.
// =============================================================================

import { supabase } from "./supabase"; // see breaking-ticker.ts for the client

export type VaultKey = {
  service_name: string;
  environment: "prod" | "staging";
  key_available: boolean;
  usage_percent: number;
  last_tested: string | null;
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
  /// Returns readiness metadata; plaintext keys are never returned to clients.
  static Future<String?> getApiKey(String serviceName,
      {String environment = 'prod'}) async {
    final res = await Supabase.instance.client.functions.invoke(
      'getApiKey',
      body: {'service_name': serviceName, 'environment': environment},
    );
    final data = res.data as Map<String, dynamic>?;
    if (res.status != 200 || data == null) return null;
    return data['key_available'] == true ? serviceName : null;
  }

  /// Example: reader app audio mode (DW-style TTS) fetches its ElevenLabs key:
  // final elevenLabsKey = await VaultService.getApiKey('ELEVENLABS_API_KEY');
}
*/
