/// Capture + location adapters.
///
/// These are intentionally plugin-free adapters so the app compiles on a stock
/// toolchain. Each method documents the exact native package to wire in
/// production (camera / image_picker / geolocator / speech_to_text / ML Kit).
/// Until then they return graceful defaults (no crash, honest message).
library;

import '../models.dart';

class CaptureResult {
  final String? filePath; // null when no real file captured
  final String label; // user-facing summary
  final CaptureMode mode;

  const CaptureResult({this.filePath, required this.label, required this.mode});
}

class CaptureService {
  CaptureService._();
  static final CaptureService instance = CaptureService._();

  /// Open the platform camera/image picker.
  /// Production wiring: `image_picker` ImagePicker().pickImage(source: camera)
  /// or the `camera` plugin for an in-app viewfinder.
  Future<CaptureResult> capture(CaptureMode mode) async {
    switch (mode) {
      case CaptureMode.photo:
        return const CaptureResult(
          label: 'ছবি তোলা হবে (ক্যামেরা প্লাগইন লাগবে)',
          mode: CaptureMode.photo,
        );
      case CaptureMode.video:
        return const CaptureResult(
          label: 'ভিডিও রেকর্ড (ক্যামেরা প্লাগইন লাগবে)',
          mode: CaptureMode.video,
        );
      case CaptureMode.audio:
        return const CaptureResult(
          label: 'অডিও রেকর্ড (mic প্লাগইন লাগবে)',
          mode: CaptureMode.audio,
        );
      case CaptureMode.text:
        return const CaptureResult(
          label: 'টেক্সট নোট — সরাসরি লিখুন',
          mode: CaptureMode.text,
        );
    }
  }

  /// Whisper-style Bangla transcription (server-side AI).
  /// Production: POST $ReporterConfig.aiProcessReportEndpoint with audio file.
  Future<String> transcribe(String? mediaPath) async {
    return 'ট্রান্সক্রিপশন আসবে AI সার্ভিস থেকে (BV_AI_PROCESS_URL সেট করলে)।';
  }

  /// 3-bullet Bangla AI summary.
  Future<String> summarize(String body) async {
    return 'AI সারাংশ: এখানে ৩টি বুলেট আসবে যখন AI endpoint যুক্ত হবে।';
  }
}

class LocationResult {
  final double? lat;
  final double? lng;
  final String label; // e.g. "📍 ঘোড়াঘাট, দিনাজপুর"
  final String rawTag;

  const LocationResult({
    this.lat,
    this.lng,
    required this.label,
    required this.rawTag,
  });
}

class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  /// Production wiring: `geolocator` — getCurrentPosition() then
  /// reverse-geocode with a Bangla gazetteer or Google Geocoding API.
  /// Falls back to a manual prompt so the tag is never empty.
  Future<LocationResult> current() async {
    return const LocationResult(
      lat: null,
      lng: null,
      label: '📍 অবস্থান যোগ করুন (জিপিএস প্লাগইন লাগবে)',
      rawTag: 'অজানা অবস্থান',
    );
  }

  /// Humanised date-time for the capture overlay.
  String timestamp(DateTime t) {
    final h = t.hour.toString().padLeft(2, '0');
    final m = t.minute.toString().padLeft(2, '0');
    final d = '${t.day}/${t.month}/${t.year}';
    return '$d · $h:$m';
  }
}
