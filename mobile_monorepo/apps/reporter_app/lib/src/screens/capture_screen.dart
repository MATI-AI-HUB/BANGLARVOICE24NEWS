/// Capture screen — top 60% viewfinder (with rule-of-thirds grid overlay),
/// bottom 40% controls: PHOTO|VIDEO|AUDIO|TEXT toggle, big red record button,
/// auto location + timestamp tag, AI helper buttons (transcribe / summary).
///
/// The viewfinder area is a styled placeholder until the `camera` plugin is
/// wired (CaptureService.capture documents the exact production swap); the
/// rest of the UI is real and functional.
library;

import 'package:flutter/material.dart';

import '../config.dart';
import '../models.dart';
import '../services/capture_service.dart';
import '../services/reporter_session.dart';
import '../theme.dart';
import 'draft_screen.dart';

class CaptureScreen extends StatefulWidget {
  const CaptureScreen({super.key});

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  CaptureMode _mode = CaptureMode.photo;
  bool _recording = false;
  String _locationTag = '📍 অবস্থান নেওয়া হচ্ছে…';
  String _timestamp = '';
  CaptureResult? _lastCapture;
  bool _aiBusy = false;

  @override
  void initState() {
    super.initState();
    _timestamp = LocationService.instance.timestamp(DateTime.now());
    _loadLocation();
  }

  Future<void> _loadLocation() async {
    final loc = await LocationService.instance.current();
    if (!mounted) return;
    setState(() => _locationTag = loc.label);
  }

  Future<void> _toggleRecord() async {
    if (_recording) {
      setState(() => _recording = false);
      return;
    }
    // Real flow: start camera/mic recording via CaptureService. Until the
    // native plugin is present this marks the UI state and captures a stub.
    final result = await CaptureService.instance.capture(_mode);
    setState(() {
      _recording = _mode != CaptureMode.photo && _mode != CaptureMode.text;
      _lastCapture = result;
    });
    if (_mode == CaptureMode.photo || _mode == CaptureMode.text) {
      // Photo/text are single-shot: jump straight into the draft with a stub
      // media path so the reporter can type the story.
      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => DraftScreen(
              prefillMode: _mode,
              prefillMediaLabel: result.label,
            ),
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(result.label)));
    }
  }

  Future<void> _aiAction(String kind) async {
    if (!ReporterConfig.aiEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'AI সার্ভিস যুক্ত হয়নি — BV_AI_PROCESS_URL সেট করলে Whisper ট্রান্সক্রিপশন/সারাংশ আসবে।',
          ),
        ),
      );
      return;
    }
    setState(() => _aiBusy = true);
    final text = kind == 'transcribe'
        ? await CaptureService.instance.transcribe(_lastCapture?.filePath)
        : await CaptureService.instance.summarize('…');
    if (!mounted) return;
    setState(() => _aiBusy = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    final session = SessionStore.current;
    final role = session?.role ?? ReporterRole.citizen;
    return Scaffold(
      appBar: AppBar(
        title: const Text('রিপোর্ট ক্যাপচার'),
        actions: [
          if (session != null && role.isStaff)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1D4ED8),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.verified, size: 14, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'স্টাফ',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // ---- Top 60%: viewfinder + grid overlay ----
          Expanded(
            flex: 3,
            child: Container(
              width: double.infinity,
              color: const Color(0xFF0A0E14),
              child: Stack(
                children: [
                  // Placeholder viewfinder. Production: CameraPreview widget.
                  Positioned.fill(
                    child: Center(
                      child: Icon(
                        _mode == CaptureMode.photo
                            ? Icons.photo_camera
                            : _mode == CaptureMode.video
                            ? Icons.videocam
                            : _mode == CaptureMode.audio
                            ? Icons.mic
                            : Icons.notes,
                        size: 64,
                        color: Colors.white24,
                      ),
                    ),
                  ),
                  // Rule-of-thirds grid
                  const _GridOverlay(),
                  // Recording / LIVE indicator
                  if (_recording)
                    Positioned(
                      top: 16,
                      left: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.shade700,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.circle, size: 10, color: Colors.white),
                            const SizedBox(width: 6),
                            const Text(
                              'REC',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  // Mode chip top-right
                  Positioned(
                    top: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black45,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Text(
                        _mode.label,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ),
                  ),
                  // Location + timestamp bottom-left of the viewfinder
                  Positioned(
                    left: 14,
                    right: 14,
                    bottom: 12,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _locationTag,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.schedule,
                              size: 13,
                              color: Colors.white70,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _timestamp,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
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
          ),
          // ---- Bottom 40%: mode toggle + record + AI ----
          Expanded(
            flex: 2,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Column(
                children: [
                  // Media-type segmented toggle
                  _ModeToggle(
                    value: _mode,
                    onChanged: (m) => setState(() => _mode = m),
                  ),
                  const SizedBox(height: 12),
                  // Location pill + record row
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'অটো ট্যাগ: ${role == ReporterRole.staff ? "স্টাফ" : "নাগরিক সাংবাদিক"} মোড',
                              style: TextStyle(
                                fontSize: 11,
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _mode == CaptureMode.text
                                  ? 'টেক্সট মোড — ড্রাফটে লিখুন'
                                  : 'লাল বাটন চাপুন ${_mode.label} নিতে',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Big record button
                      GestureDetector(
                        onTap: _toggleRecord,
                        child: Container(
                          width: 66,
                          height: 66,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _recording ? Colors.red.shade900 : kBrandRed,
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: [
                              BoxShadow(
                                color: kBrandRed.withValues(alpha: 0.4),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                          child: Center(
                            child: _recording
                                ? Container(
                                    width: 20,
                                    height: 20,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  )
                                : const Icon(
                                    Icons.circle,
                                    color: Colors.white,
                                    size: 26,
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.touch_app,
                              size: 16,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _mode == CaptureMode.text
                                  ? 'টেক্সটে যাবে'
                                  : _recording
                                  ? 'রেকর্ডিং চলছে…'
                                  : 'ট্যাপ = ${_mode.label}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  // AI row
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _aiBusy
                              ? null
                              : () => _aiAction('transcribe'),
                          icon: const Icon(Icons.transcribe, size: 18),
                          label: const Text('AI ট্রান্সক্রাইব করুন'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: kDeepNavy,
                            side: const BorderSide(color: kDeepNavy),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _aiBusy
                              ? null
                              : () => _aiAction('summary'),
                          icon: const Icon(Icons.auto_awesome, size: 18),
                          label: const Text('AI সারাংশ'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: kBrandRed,
                            side: const BorderSide(color: kBrandRed),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GridOverlay extends StatelessWidget {
  const _GridOverlay();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Column(
        children: [
          const Spacer(),
          Row(
            children: [
              const Spacer(),
              Expanded(child: Divider(color: Colors.white24, height: 1)),
              const Spacer(),
              Expanded(child: Divider(color: Colors.white24, height: 1)),
              const Spacer(),
            ],
          ),
          const Spacer(),
          Container(color: Colors.white12, height: 1),
          const Spacer(),
          Row(
            children: [
              const Spacer(),
              Expanded(child: Divider(color: Colors.white24, height: 1)),
              const Spacer(),
              Expanded(child: Divider(color: Colors.white24, height: 1)),
              const Spacer(),
            ],
          ),
          const Spacer(),
        ],
      ),
    );
  }
}

class _ModeToggle extends StatelessWidget {
  final CaptureMode value;
  final ValueChanged<CaptureMode> onChanged;

  const _ModeToggle({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final modes = CaptureMode.values;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: modes.map((m) {
          final selected = m == value;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(m),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: selected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 6,
                          ),
                        ]
                      : null,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      m.icon,
                      size: 18,
                      color: selected
                          ? kBrandRed
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      m.label,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        color: selected
                            ? kBrandRed
                            : Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
