import 'package:video_player/video_player.dart';

/// Wraps video_player for live HLS/m3u8 streaming.
class TvVideoService {
  VideoPlayerController? _controller;
  VideoPlayerController? get controller => _controller;

  bool get isReady => _controller?.value.isInitialized ?? false;
  bool get isPlaying => _controller?.value.isPlaying ?? false;

  Future<bool> load(String url) async {
    if (url.isEmpty) return false;
    try {
      await _controller?.dispose();
      final c = VideoPlayerController.networkUrl(Uri.parse(url));
      await c.initialize();
      _controller = c;
      return true;
    } catch (_) {
      _controller = null;
      return false;
    }
  }

  Future<void> play() async {
    try {
      await _controller?.play();
    } catch (_) {}
  }

  Future<void> pause() async {
    try {
      await _controller?.pause();
    } catch (_) {}
  }

  void dispose() {
    _controller?.dispose();
    _controller = null;
  }
}
