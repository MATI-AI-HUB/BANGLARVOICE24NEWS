import 'dart:async';

import 'package:flutter/material.dart';

import '../models/live_session.dart';
import '../services/agora_service.dart';
import '../services/live_stream_service.dart';

/// Active broadcast UI. Ends stream on "Stop".
class GoLiveScreen extends StatefulWidget {
  const GoLiveScreen({
    super.key,
    required this.session,
    required this.agora,
    required this.liveService,
  });

  final LiveSession session;
  final AgoraService agora;
  final LiveStreamService liveService;

  @override
  State<GoLiveScreen> createState() => _GoLiveScreenState();
}

class _GoLiveScreenState extends State<GoLiveScreen> {
  Timer? _ticker;
  Duration _elapsed = Duration.zero;
  int _viewers = 0;
  bool _muted = false;
  bool _cameraOff = false;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _elapsed += const Duration(seconds: 1));
      if (_elapsed.inSeconds % 5 == 0) _pollViewers();
    });
  }

  Future<void> _pollViewers() async {
    final v = await widget.liveService.fetchViewerCount(widget.session.id);
    if (!mounted) return;
    setState(() => _viewers = v);
  }

  String get _elapsedLabel {
    final m = _elapsed.inMinutes.toString().padLeft(2, '0');
    final s = (_elapsed.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _stop() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('লাইভ বন্ধ করবেন?'),
        content: Text(
          'সময়: $_elapsedLabel\nদর্শক: $_viewers',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('বাতিল'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('বন্ধ করুন'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    await widget.agora.stopBroadcast();
    await widget.liveService.endSession(widget.session.id);
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Full-screen camera
            Positioned.fill(child: widget.agora.renderLocalPreview()),

            // Top overlay: LIVE badge + timer + viewers
            Positioned(
              top: 12,
              left: 12,
              right: 12,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.circle, color: Colors.white, size: 10),
                        SizedBox(width: 6),
                        Text(
                          'LIVE',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _elapsedLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.visibility,
                            color: Colors.white, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          '$_viewers',
                          style: const TextStyle(color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Title
            Positioned(
              top: 60,
              left: 12,
              right: 12,
              child: Text(
                widget.session.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(blurRadius: 8, color: Colors.black)],
                ),
              ),
            ),

            // Bottom controls
            Positioned(
              bottom: 20,
              left: 20,
              right: 20,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _circleBtn(
                    icon: _muted ? Icons.mic_off : Icons.mic,
                    onTap: () async {
                      setState(() => _muted = !_muted);
                      await widget.agora.toggleMute(_muted);
                    },
                  ),
                  _circleBtn(
                    icon: _cameraOff ? Icons.videocam_off : Icons.videocam,
                    onTap: () async {
                      setState(() => _cameraOff = !_cameraOff);
                      await widget.agora.toggleCamera(_cameraOff);
                    },
                  ),
                  _circleBtn(
                    icon: Icons.flip_camera_android,
                    onTap: () async => widget.agora.switchCamera(),
                  ),
                  _circleBtn(
                    icon: Icons.stop,
                    color: Colors.red,
                    onTap: _stop,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _circleBtn({
    required IconData icon,
    required VoidCallback onTap,
    Color color = Colors.white24,
  }) {
    return Material(
      color: color,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Icon(icon, color: Colors.white, size: 26),
        ),
      ),
    );
  }
}
