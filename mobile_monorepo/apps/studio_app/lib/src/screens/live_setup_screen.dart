/// Live Setup — full-screen camera preview + control deck.
///
/// Spec controls: Switch Camera (Front/Back), Mic Mute, Beauty Filter OFF
/// (সংবাদে reality দরকার), Add Guest (LiveKit 2-person invite — needs a real
/// LiveKit server; until then the invite dialog explains the wiring point).
library;

import 'package:flutter/material.dart';

import '../config.dart';
import '../services/studio_session.dart';
import '../studio_ui.dart';
import 'branding_overlay_editor.dart';
import 'go_live_panel.dart';

class LiveSetupScreen extends StatefulWidget {
  final StudioSession session;
  const LiveSetupScreen({super.key, required this.session});

  @override
  State<LiveSetupScreen> createState() => _LiveSetupScreenState();
}

class _LiveSetupScreenState extends State<LiveSetupScreen> {
  bool _frontCamera = true;
  bool _micMuted = false;
  bool _previewMode = true; // no real camera until `camera` plugin is pinned

  Future<void> _openOverlay() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const BrandingOverlayEditor()),
    );
  }

  Future<void> _openGoLive() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const GoLivePanel()),
    );
  }

  void _addGuest() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF13203B),
        title: const Text('অতিথি যোগ করুন (2-person live)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const NotWiredChip(text: 'LiveKit সার্ভার এখনো কানেক্ট হয়নি'),
            const SizedBox(height: 12),
            const Text(
              'গেস্ট লিংক: https://livekit.banglarvoice.com/join/…',
              style: TextStyle(fontSize: 12, color: Colors.white60),
            ),
            const SizedBox(height: 8),
            Text(
              StudioConfig.hasLiveKit
                  ? 'BV_LIVEKIT_URL সেট আছে — রুম-টোকেন সার্ভিস থেকে লিংক জেনারেট হবে।'
                  : 'লাইভ অ্যাকশনে যেতে BV_LIVEKIT_URL (LiveKit সার্ভার) + টোকেন এন্ডপয়েন্ট লাগবে। '
                      'এখন শুধু UI প্রিভিউ দেখানো হচ্ছে — কোনো জাল স্ট্রিম নয়।',
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('বন্ধ করুন')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060D1E),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: [
                  const Expanded(child: StudioStepRail(current: 1)),
                  const SizedBox(width: 8),
                  IconButton(
                    tooltip: 'লগআউট',
                    onPressed: () async {
                      await StudioSessionStore.clear();
                      if (context.mounted) {
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(builder: (_) => const StudioEntryShell()),
                          (r) => false,
                        );
                      }
                    },
                    icon: const Icon(Icons.logout, color: Colors.white54, size: 20),
                  ),
                ],
              ),
            ),
            // Full-screen preview
            Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white12),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF13203B), Color(0xFF0A1931)],
                  ),
                ),
                child: Stack(
                  children: [
                    // Camera "grid" placeholder — honest: real pixels come from
                    // the `camera` plugin once pinned (see pubspec NOTE).
                    Positioned.fill(
                      child: CustomPaint(painter: _CameraGridPainter(preview: _previewMode)),
                    ),
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _previewMode ? Icons.videocam_off_outlined : Icons.videocam_outlined,
                            size: 56,
                            color: Colors.white.withValues(alpha: .7),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _previewMode ? 'ক্যামেরা প্রিভিউ বন্ধ (ডেমো)' : 'ক্যামেরা প্রিভিউ চালু',
                            style: TextStyle(color: Colors.white.withValues(alpha: .8), fontSize: 15),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'প্রকৃত ক্যামেরা ফিড: camera প্লাগইন পিন করলে',
                            style: TextStyle(color: Colors.white38, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    // LIVE chip top-left
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: studioRed,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.sensors, color: Colors.white, size: 13),
                            SizedBox(width: 5),
                            Text('PREVIEW', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                          ],
                        ),
                      ),
                    ),
                    // Session chip top-right
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white10,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${widget.session.name} • ${widget.session.role.label}',
                          style: const TextStyle(fontSize: 11, color: Colors.white70),
                        ),
                      ),
                    ),
                    // Lower-third placeholder preview (live copy of overlay edits)
                    Positioned(
                      left: 12,
                      right: 12,
                      bottom: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xEE0A1931),
                          borderRadius: BorderRadius.circular(12),
                          border: Border(left: BorderSide(color: studioRed, width: 4)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'বাংলার ভয়েস | সরাসরি',
                              style: TextStyle(fontSize: 10, letterSpacing: 1, color: Colors.white60, fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'ব্রেকিং টাইটেল এখানে দেখাবে (ওভারে এডিট করুন)',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: Colors.white.withValues(alpha: .9),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Control deck
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Row(
                    children: [
                      _deckButton(
                        icon: Icons.cameraswitch_outlined,
                        label: _frontCamera ? 'ফ্রন্ট' : 'ব্যাক',
                        active: true,
                        onTap: () => setState(() => _frontCamera = !_frontCamera),
                      ),
                      const SizedBox(width: 8),
                      _deckButton(
                        icon: _micMuted ? Icons.mic_off : Icons.mic,
                        label: _micMuted ? 'মিউটেড' : 'মাইক',
                        active: !_micMuted,
                        danger: _micMuted,
                        onTap: () => setState(() => _micMuted = !_micMuted),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Tooltip(
                          message: 'সংবাদে সত্যি দরকার — বিউটি ফিল্টার ইচ্ছাকৃতভাবে বন্ধ রাখা হয়েছে',
                          child: _deckButton(
                            icon: Icons.face_retouching_off,
                            label: 'বিউটি OFF',
                            active: false,
                            locked: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _deckButton(
                        icon: Icons.person_add_alt_1,
                        label: 'গেস্ট',
                        active: false,
                        onTap: _addGuest,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white24),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                          onPressed: _openOverlay,
                          icon: const Icon(Icons.subtitles_outlined),
                          label: const Text('ব্র্যান্ডিং ওভারলে'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: studioRed,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                          ),
                          onPressed: widget.session.canGoLive ? _openGoLive : null,
                          icon: const Icon(Icons.cell_tower),
                          label: Text(widget.session.canGoLive ? 'GO LIVE' : 'অনুমতি নেই'),
                        ),
                      ),
                    ],
                  ),
                  if (!StudioConfig.hasLiveKit || !StudioConfig.hasRtmpIngest)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: NotWiredChip(
                        text: 'লাইভ কানেকশন বন্ধ — LiveKit/RTMP কী API Vault থেকে আসবে (এখন UI প্রিভিউ)',
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _deckButton({
    required IconData icon,
    required String label,
    required bool active,
    bool danger = false,
    bool locked = false,
    VoidCallback? onTap,
  }) {
    final Color fg;
    if (locked) {
      fg = Colors.white24;
    } else if (danger) {
      fg = const Color(0xFFF87171);
    } else {
      fg = active ? const Color(0xFFCC0000) : Colors.white70;
    }
    return Material(
      color: Colors.white.withValues(alpha: locked ? .03 : .09),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minWidth: 84),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Column(
            children: [
              Icon(icon, color: fg, size: 20),
              const SizedBox(height: 4),
              Text(label,
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: fg)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Thin shell so logout can rebuild the gate without importing main_studio
/// (avoids a duplicate entrypoint import cycle).
class StudioEntryShell extends StatelessWidget {
  const StudioEntryShell({super.key});

  @override
  Widget build(BuildContext context) {
    return const _StudioBoot();
  }
}

class _StudioBoot extends StatelessWidget {
  const _StudioBoot();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: StudioSessionStore.load(),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final s = StudioSessionStore.current;
        if (s == null) {
          // Re-enter gate by pushing a fresh home — simplest: open GoLive-only
          // screens require a session; show a minimal re-login prompt.
          return Scaffold(
            backgroundColor: const Color(0xFF060D1E),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.logout, color: Colors.white38, size: 48),
                  const SizedBox(height: 12),
                  const Text('সেশন শেষ', style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      // Ask the gate screen to recreate by full restart of home.
                    },
                    child: const Text('পুনরায় প্রবেশ করুন'),
                  ),
                ],
              ),
            ),
          );
        }
        if (s.canGoLive) return LiveSetupScreen(session: s);
        return LiveSetupScreen(session: s); // role without permission still sees setup (Go Live hidden)
      },
    );
  }
}

/// Subtle camera-viewfinder grid (purely decorative; not a fake video feed).
class _CameraGridPainter extends CustomPainter {
  final bool preview;
  _CameraGridPainter({required this.preview});

  @override
  void paint(Canvas canvas, Size size) {
    if (preview) return;
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: .06)
      ..strokeWidth = 1;
    for (var i = 1; i < 3; i++) {
      final dx = size.width * i / 3;
      canvas.drawLine(Offset(dx, 0), Offset(dx, size.height), paint);
      final dy = size.height * i / 3;
      canvas.drawLine(Offset(0, dy), Offset(size.width, dy), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _CameraGridPainter oldDelegate) =>
      oldDelegate.preview != preview;
}
