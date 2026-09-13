import 'package:flutter/material.dart';

import '../config.dart';
import '../services/agora_service.dart';
import '../services/live_stream_service.dart';
import 'go_live_screen.dart';

/// Pre-stream setup: enter title → preview → go live.
class LivePreviewScreen extends StatefulWidget {
  const LivePreviewScreen({super.key, this.reporterName = 'রিপোর্টার'});

  final String reporterName;

  @override
  State<LivePreviewScreen> createState() => _LivePreviewScreenState();
}

class _LivePreviewScreenState extends State<LivePreviewScreen> {
  final _title = TextEditingController();
  final _agora = AgoraService();
  final _live = LiveStreamService();

  bool _ready = false;
  bool _starting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    if (!ReporterConfig.agoraConfigured) {
      setState(() {
        _error = 'Agora App ID কনফিগার করা হয়নি। config.dart-এ যোগ করুন।';
      });
      return;
    }
    final ok = await _agora.init();
    if (!mounted) return;
    setState(() {
      _ready = ok;
      if (!ok) _error = 'ক্যামেরা চালু করা যায়নি — permission দিন।';
    });
  }

  Future<void> _goLive() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      setState(() => _error = 'শিরোনাম লিখুন');
      return;
    }
    setState(() {
      _starting = true;
      _error = null;
    });

    final channel = _live.generateChannel(widget.reporterName);
    final started = await _agora.startBroadcast(channel: channel);
    if (!started) {
      setState(() {
        _starting = false;
        _error = 'লাইভ শুরু করা যায়নি';
      });
      return;
    }

    final session = await _live.startSession(
      title: title,
      reporterName: widget.reporterName,
      channel: channel,
    );

    if (!mounted) return;
    setState(() => _starting = false);

    if (session == null) {
      setState(() => _error = 'সেশন তৈরি করা যায়নি');
      return;
    }

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => GoLiveScreen(
          session: session,
          agora: _agora,
          liveService: _live,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _agora.dispose();
    _title.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('লাইভ শুরু করুন'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Camera preview
            Expanded(
              child: _ready
                  ? _agora.renderLocalPreview()
                  : const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
            ),
            // Controls
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _title,
                    style: const TextStyle(color: Colors.white),
                    maxLength: 80,
                    decoration: InputDecoration(
                      hintText: 'শিরোনাম লিখুন (যেমন: সংসদের সামনে লাইভ)',
                      hintStyle: const TextStyle(color: Colors.white54),
                      filled: true,
                      fillColor: Colors.white10,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      counterStyle: const TextStyle(color: Colors.white38),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      _error!,
                      style: const TextStyle(color: Colors.orangeAccent),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      IconButton.filledTonal(
                        onPressed: _ready ? () => _agora.switchCamera() : null,
                        icon: const Icon(Icons.flip_camera_android),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.red,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          onPressed: (_ready && !_starting) ? _goLive : null,
                          icon: _starting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.live_tv),
                          label: Text(
                            _starting ? 'শুরু হচ্ছে...' : 'লাইভ শুরু করুন',
                            style: const TextStyle(fontSize: 16),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
