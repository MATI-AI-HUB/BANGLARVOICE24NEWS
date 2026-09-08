/// Go Live Panel — multi-destination control before broadcast.
///
/// Destinations: Website Live Player, App Push Alert, Facebook Page, YouTube
/// Live. RTMP/Facebook/YouTube keys come from the Admin Console API Vault —
/// never baked into the APK. When vault keys are absent every destination shows
/// an honest status chip and "গো লাইভ" runs in local demo-live mode (no real
/// stream leaves the device — this is a UI scaffold, not a fake broadcast).
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../config.dart';
import '../studio_ui.dart';
import 'live_controls_screen.dart';

class Destination {
  final String id;
  final String label;
  final String bnLabel;
  final IconData icon;
  bool enabled;
  Destination({required this.id, required this.label, required this.bnLabel, required this.icon, this.enabled = false});
}

class GoLivePanel extends StatefulWidget {
  const GoLivePanel({super.key});

  @override
  State<GoLivePanel> createState() => _GoLivePanelState();
}

class _GoLivePanelState extends State<GoLivePanel> {
  final List<Destination> _destinations = [
    Destination(id: 'web', label: 'Website Live Player', bnLabel: 'ওয়েবসাইট লাইভ প্লেয়ার', icon: Icons.language),
    Destination(id: 'push', label: 'App Push Alert', bnLabel: 'অ্যাপ পুশ অ্যালার্ট', icon: Icons.notifications_active_outlined),
    Destination(id: 'fb', label: 'Facebook Page', bnLabel: 'ফেসবুক পেজ', icon: Icons.video_library_outlined),
    Destination(id: 'yt', label: 'YouTube Live', bnLabel: 'ইউটিউব লাইভ', icon: Icons.ondemand_video),
  ];

  bool _live = false;
  Timer? _liveTimer;
  int _elapsed = 0;

  // Seed viewer/comment state (clearly demo numbers, replaced by real feed).
  int _viewers = 12400;
  final List<String> _comments = [
    'ভাইয়া সরাসরি ক্যামেরা কোথায়?',
    'পদ্মা সেতুর খবরটা একটু বিস্তারিত দেন',
    'দারুণ শুরু!',
    'ঢাকায় কি বৃষ্টি হচ্ছে এখন?',
  ];

  static const _badWords = [
    'মূর্খ', 'বোকা', 'ওসব', 'হালা', 'গাধা', 'চুষে', 'fuck', 'shit', 'bitch',
  ];

  String _filter(String raw) {
    var out = raw;
    for (final w in _badWords) {
      if (out.toLowerCase().contains(w.toLowerCase())) {
        out = '⚠️ ফিল্টারড (অশালীন শব্দ)';
      }
    }
    return out;
  }

  @override
  void dispose() {
    _liveTimer?.cancel();
    super.dispose();
  }

  void _goLive() {
    setState(() => _live = true);
    _liveTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _elapsed++;
        _viewers = 12400 + (_elapsed * 3) + (_elapsed % 7);
      });
    });
  }

  Future<void> _openControls() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const LiveControlsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mm = '${(_elapsed ~/ 60).toString().padLeft(2, '0')}:${(_elapsed % 60).toString().padLeft(2, '0')}';
    return Scaffold(
      backgroundColor: const Color(0xFF060D1E),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A1931),
        title: const Text('গো লাইভ প্যানেল'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: .06),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.visibility_outlined, color: Colors.white.withValues(alpha: .7), size: 18),
                      const SizedBox(width: 6),
                      Text(
                        '$_viewers দর্শক',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(width: 6),
                      Text('(ডেমো কাউন্টার)', style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: .4))),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _live ? studioRed : Colors.white10,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    if (_live) ...[
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 6),
                      Text('LIVE $mm', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                    ] else
                      const Text('প্রস্তুত', style: TextStyle(fontSize: 13, color: Colors.white60)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text('গন্তব্য (Destination)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ..._destinations.map((d) {
            final wired = d.id == 'web' || d.id == 'push'
                ? true
                : d.id == 'fb'
                    ? StudioConfig.hasRtmpIngest
                    : StudioConfig.hasRtmpIngest;
            return Card(
              color: Colors.white.withValues(alpha: .05),
              margin: const EdgeInsets.only(bottom: 8),
              child: CheckboxListTile(
                value: d.enabled,
                onChanged: (v) => setState(() => d.enabled = v ?? false),
                secondary: Icon(d.icon, color: d.enabled ? studioRed : Colors.white38),
                title: Text(d.bnLabel, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                subtitle: Row(
                  children: [
                    if (!wired)
                      const NotWiredChip(text: 'RTMP কী API Vault থেকে লাগবে')
                    else
                      Text(d.label, style: const TextStyle(fontSize: 11, color: Colors.white38)),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 4),
          // Live comments feed with AI bad-word auto-filter
          Row(
            children: [
              const Expanded(child: Text('লাইভ কমেন্ট (AI অটো-ফিল্টার চালু)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800))),
              const NotWiredChip(text: 'ফিল্টার লোকাল — ব্যাকএন্ড মডারেশন আসবে'),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            height: 140,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .04),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white10),
            ),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              itemCount: _comments.length,
              itemBuilder: (ctx, i) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    CircleAvatar(radius: 10, backgroundColor: const Color(0xFF0A1931), child: const Icon(Icons.person, size: 12, color: Colors.white54)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_comments[i], style: const TextStyle(fontSize: 12.5))),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  onSubmitted: (v) {
                    if (v.trim().isEmpty) return;
                    setState(() => _comments.insert(0, _filter(v.trim())));
                  },
                  style: const TextStyle(fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'কমেন্ট লিখুন…',
                    isDense: true,
                    filled: true,
                    fillColor: Color(0xFF13203B),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFF0A1931)),
                onPressed: () {},
                child: const Icon(Icons.send, size: 16),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (!_live)
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: studioRed,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _goLive,
              icon: const Icon(Icons.cell_tower),
              label: const Text('🚨 গো লাইভ (১০ সেকেন্ড)', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
            )
          else ...[
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: studioRed,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _openControls,
              icon: const Icon(Icons.settings_remote),
              label: const Text('লাইভ কন্ট্রোলে যান', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            ),
            const SizedBox(height: 8),
            if (!StudioConfig.hasRtmpIngest && !StudioConfig.hasLiveKit)
              const NotWiredChip(text: 'ডেমো-লাইভ মোড: প্রকৃত স্ট্রিম শুরু হয়নি (LiveKit/RTMP কী লাগবে)'),
          ],
        ],
      ),
    );
  }
}
