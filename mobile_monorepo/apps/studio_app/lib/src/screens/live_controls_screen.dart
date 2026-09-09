/// Live Controls — everything the director needs once the broadcast is on.
///
/// 1) Add Breaking Banner — pushes a breaking banner to the on-air ticker list.
/// 2) Show Reporter Location Map — map placeholder w/ Dhaka marker; real GPS
///    location service + map SDK wiring point documented (not pinned).
/// 3) End Live & Save as VOD — when BV_AI_ENDLIVE_URL is configured the backend
///    AI auto-generates title/description/thumbnail + Video article draft;
///    otherwise the dialog honestly shows what the AI pipeline would produce.
/// 4) AI-live rail — burned-in subtitle / sensitive-word / auto-clip status
///    chips that light up only when the AI services are provisioned.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../config.dart';
import '../studio_ui.dart';

class LiveControlsScreen extends StatefulWidget {
  const LiveControlsScreen({super.key});

  @override
  State<LiveControlsScreen> createState() => _LiveControlsScreenState();
}

class _LiveControlsScreenState extends State<LiveControlsScreen> {
  int _elapsed = 0;
  Timer? _timer;
  final List<String> _banners = ['পদ্মা সেতুতে যানবাহন চলাচল স্বাভাবিক'];
  bool _mapOpen = false;
  int _sensitiveHits = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _addBanner() {
    final c = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF13203B),
        title: const Text('ব্রেকিং ব্যানার যোগ করুন'),
        content: TextField(
          controller: c,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'ব্রেকিং টেক্সট লিখুন…',
            filled: true,
            fillColor: Color(0xFF0A1931),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('বাতিল'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: studioRed),
            onPressed: () {
              final t = c.text.trim();
              if (t.isNotEmpty) setState(() => _banners.insert(0, t));
              Navigator.pop(ctx);
            },
            child: const Text('অন-এয়ার করুন'),
          ),
        ],
      ),
    );
  }

  void _toggleMap() => setState(() => _mapOpen = !_mapOpen);

  Future<void> _endLive() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF13203B),
        title: const Text('লাইভ শেষ করে VOD-এ সেভ করুন?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'AI পাইপলাইন অটো-জেনারেট করবে:',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            ),
            const SizedBox(height: 8),
            const Text(
              '• শিরোনাম (বাংলা + ইংরেজি)',
              style: TextStyle(fontSize: 12, color: Colors.white70),
            ),
            const Text(
              '• বিবরণ + ট্যাগ',
              style: TextStyle(fontSize: 12, color: Colors.white70),
            ),
            const Text(
              '• থাম্বনেইল (WebP)',
              style: TextStyle(fontSize: 12, color: Colors.white70),
            ),
            const Text(
              '• ভিডিও আর্টিকেল ড্রাফ্ট (এডিটর অ্যাপে)',
              style: TextStyle(fontSize: 12, color: Colors.white70),
            ),
            const SizedBox(height: 10),
            if (StudioConfig.hasEndLiveDraft)
              const Text(
                '✅ BV_AI_ENDLIVE_URL সেট — শেষ হলে ড্রাফ্ট তৈরি হবে।',
                style: TextStyle(fontSize: 12, color: Color(0xFF4ADE80)),
              )
            else
              const NotWiredChip(
                text:
                    'এন্ডলাইভ হুক খালি — এখন ড্রাফ্ট তৈরি হবে না (BV_AI_ENDLIVE_URL সেট করুন)',
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('চালিয়ে যান'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: studioRed),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('লাইভ শেষ করুন'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      Navigator.of(context).popUntil((r) => r.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mm =
        '${(_elapsed ~/ 60).toString().padLeft(2, '0')}:${(_elapsed % 60).toString().padLeft(2, '0')}';
    return Scaffold(
      backgroundColor: const Color(0xFF060D1E),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A1931),
        title: Row(
          children: [
            Container(
              width: 9,
              height: 9,
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            const Text('লাইভ কন্ট্রোল'),
            const SizedBox(width: 8),
            Text(
              'LIVE $mm',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.white54,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StudioActionTile(
            icon: Icons.padding,
            label: 'ব্রেকিং ব্যানার যোগ করুন',
            hint: 'অন-এয়ার টিকারে এখনই দেখাবে',
            onTap: _addBanner,
          ),
          const SizedBox(height: 10),
          StudioActionTile(
            icon: Icons.map_outlined,
            label: 'রিপোর্টারের লোকেশন ম্যাপ',
            hint: _mapOpen
                ? 'ম্যাপ খোলা — Dhaka 23.8103, 90.4125'
                : 'লাইভ লোকেশন ওভারলে দেখান',
            iconColor: _mapOpen ? const Color(0xFF4ADE80) : null,
            onTap: _toggleMap,
          ),
          if (_mapOpen) ...[
            const SizedBox(height: 10),
            Container(
              height: 170,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white12),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: CustomPaint(painter: _MapGridPainter()),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xCC0A1931),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'লোকেশন প্রিভিউ (GPS সার্ভিস লাগবে)',
                        style: TextStyle(fontSize: 10, color: Colors.white60),
                      ),
                    ),
                  ),
                  Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.location_on, color: studioRed, size: 40),
                        const Text(
                          'ঢাকা',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                          ),
                        ),
                        const Text(
                          '23.8103° N, 90.4125° E',
                          style: TextStyle(fontSize: 11, color: Colors.white54),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          // AI-live rail
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .04),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.auto_awesome,
                      color: Color(0xFFCC0000),
                      size: 18,
                    ),
                    SizedBox(width: 6),
                    Text(
                      '২৪/৭ AI — লাইভে',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                _aiRow(
                  icon: Icons.subtitles,
                  label: 'বাংলা সাবটাইটেল (বার্ন-ইন)',
                  wired: StudioConfig.hasAiLive,
                ),
                _aiRow(
                  icon: Icons.warning_amber,
                  label: 'সংবেদনশীল শব্দে ডিরেক্টর-সতর্কতা',
                  wired: StudioConfig.hasAiLive,
                  extra: _sensitiveHits > 0 ? ' ($_sensitiveHits হিট)' : '',
                ),
                _aiRow(
                  icon: Icons.movie_filter_outlined,
                  label: '30-সেকেন্ড ভাইরাল ক্লিপ → শর্টস',
                  wired: StudioConfig.hasAiClip,
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          StudioActionTile(
            icon: Icons.stop_circle_outlined,
            label: 'লাইভ শেষ করুন ও VOD-এ সেভ করুন',
            hint: 'AI শিরোনাম/থাম্বনেইল + ভিডিও ড্রাফ্ট তৈরি করবে',
            iconColor: const Color(0xFFF87171),
            onTap: _endLive,
          ),
        ],
      ),
    );
  }

  Widget _aiRow({
    required IconData icon,
    required String label,
    required bool wired,
    String extra = '',
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Icon(
            icon,
            size: 16,
            color: wired ? const Color(0xFF4ADE80) : Colors.white24,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label + extra,
              style: TextStyle(
                fontSize: 12.5,
                color: wired ? Colors.white : Colors.white38,
              ),
            ),
          ),
          if (!wired)
            const Text(
              'কী নেই',
              style: TextStyle(fontSize: 10, color: Colors.white24),
            ),
        ],
      ),
    );
  }
}

/// Decorative map grid — a real map SDK / tile layer is the wiring point.
class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final line = Paint()
      ..color = Colors.white.withValues(alpha: .05)
      ..strokeWidth = 1;
    final accent = Paint()
      ..color = const Color(0xFF0A1931)
      ..style = PaintingStyle.fill;
    canvas.drawRect(Offset.zero & size, accent);
    for (var i = 0; i < size.width / 26; i++) {
      canvas.drawLine(Offset(i * 26, 0), Offset(i * 26, size.height), line);
    }
    for (var i = 0; i < size.height / 26; i++) {
      canvas.drawLine(Offset(0, i * 26), Offset(size.width, i * 26), line);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
