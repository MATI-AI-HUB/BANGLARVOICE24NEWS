import 'dart:async';

import 'package:agora_rtc_engine/agora_rtc_engine.dart';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

import '../config.dart';

/// Agora RTC engine wrapper for reporter live streaming.
///
/// Usage:
///   final svc = AgoraService();
///   await svc.init();
///   await svc.startBroadcast(channel: 'bv-live-xyz');
///   // ... user goes live ...
///   await svc.stopBroadcast();
class AgoraService {
  RtcEngine? _engine;
  bool _initialized = false;
  bool _inChannel = false;
  int? _remoteUid;

  bool get isInChannel => _inChannel;
  int? get remoteUid => _remoteUid;
  bool get isInitialized => _initialized;

  /// Callback: engine ready to render video.
  VoidCallback? onEngineReady;

  Future<bool> _ensurePermissions() async {
    final camera = await Permission.camera.request();
    final mic = await Permission.microphone.request();
    return camera.isGranted && mic.isGranted;
  }

  Future<bool> init() async {
    if (!ReporterConfig.agoraConfigured) {
      debugPrint('⚠️  Agora App ID is placeholder — cannot initialize');
      return false;
    }
    if (_initialized) return true;

    final ok = await _ensurePermissions();
    if (!ok) {
      debugPrint('❌ Camera/Mic permission denied');
      return false;
    }

    try {
      _engine = createAgoraRtcEngine();
      await _engine!.initialize(RtcEngineContext(
        appId: ReporterConfig.agoraAppId,
        channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
      ));

      _engine!.registerEventHandler(RtcEngineEventHandler(
        onJoinChannelSuccess: (connection, elapsed) {
          _inChannel = true;
          debugPrint('✅ Agora: joined ${connection.channelId}');
        },
        onUserJoined: (connection, uid, elapsed) {
          _remoteUid = uid;
          debugPrint('👤 User joined: $uid');
        },
        onUserOffline: (connection, uid, reason) {
          if (_remoteUid == uid) _remoteUid = null;
        },
        onLeaveChannel: (connection, stats) {
          _inChannel = false;
        },
        onError: (err, msg) {
          debugPrint('❌ Agora error $err: $msg');
        },
      ));

      await _engine!.enableVideo();
      await _engine!.enableAudio();
      await _engine!.setVideoEncoderConfiguration(
        const VideoEncoderConfiguration(
          dimensions: VideoDimensions(
            width: ReporterConfig.videoWidth,
            height: ReporterConfig.videoHeight,
          ),
          frameRate: ReporterConfig.videoFps,
        ),
      );
      await _engine!.startPreview();

      _initialized = true;
      onEngineReady?.call();
      return true;
    } catch (e) {
      debugPrint('❌ Agora init failed: $e');
      return false;
    }
  }

  Future<bool> startBroadcast({required String channel, int uid = 0}) async {
    if (!_initialized) {
      final ok = await init();
      if (!ok) return false;
    }
    try {
      await _engine!.setClientRole(role: ClientRoleType.clientRoleBroadcaster);
      await _engine!.startPreview();
      await _engine!.joinChannel(
        token: '',
        channelId: channel,
        uid: uid,
        options: const ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
          publishCameraTrack: true,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
          autoSubscribeVideo: true,
        ),
      );
      return true;
    } catch (e) {
      debugPrint('❌ Agora startBroadcast failed: $e');
      return false;
    }
  }

  Future<void> stopBroadcast() async {
    try {
      await _engine?.leaveChannel();
      await _engine?.stopPreview();
      _inChannel = false;
    } catch (e) {
      debugPrint('⚠️  stopBroadcast: $e');
    }
  }

  Future<void> switchCamera() async {
    try {
      await _engine?.switchCamera();
    } catch (_) {}
  }

  Future<void> toggleMute(bool muted) async {
    try {
      await _engine?.muteLocalAudioStream(muted);
    } catch (_) {}
  }

  Future<void> toggleCamera(bool off) async {
    try {
      await _engine?.muteLocalVideoStream(off);
    } catch (_) {}
  }

  Widget renderLocalPreview() {
    if (_engine == null) {
      return const Center(child: Text('Camera initializing...'));
    }
    return AgoraVideoView(
      controller: VideoViewController(
        rtcEngine: _engine!,
        canvas: const VideoCanvas(uid: 0),
      ),
    );
  }

  Future<void> dispose() async {
    try {
      await _engine?.leaveChannel();
      await _engine?.release();
    } catch (_) {}
    _engine = null;
    _initialized = false;
    _inChannel = false;
  }
}
