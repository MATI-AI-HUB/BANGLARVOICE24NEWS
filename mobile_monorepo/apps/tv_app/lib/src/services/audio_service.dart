import 'dart:async';

import 'package:just_audio/just_audio.dart';

/// Wraps just_audio for 24/7 live stream playback.
class TvAudioService {
  TvAudioService();
  final AudioPlayer _player = AudioPlayer();
  StreamSubscription<PlayerState>? _sub;

  AudioPlayer get player => _player;

  Future<void> load(String url) async {
    if (url.isEmpty) return;
    try {
      await _player.setUrl(url);
    } catch (_) {}
  }

  Future<void> play() async {
    try {
      await _player.play();
    } catch (_) {}
  }

  Future<void> pause() async {
    try {
      await _player.pause();
    } catch (_) {}
  }

  Future<void> stop() async {
    try {
      await _player.stop();
    } catch (_) {}
  }

  void dispose() {
    _sub?.cancel();
    _player.dispose();
  }
}
