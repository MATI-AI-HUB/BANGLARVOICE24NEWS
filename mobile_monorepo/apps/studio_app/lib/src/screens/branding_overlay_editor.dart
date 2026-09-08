/// Branding Overlay Editor — live lower-third for breaking news.
///
/// Lower third shows "বাংলার ভয়েস | সরাসরি" brand line + the breaking title
/// typed here; bottom ticker input; logo position selector. Overlay state is
/// purely local to this editor for now (a real pipeline would composite it
/// into the encoder); the choices are returned via Navigator.pop so the live
/// screen can reuse them.
library;

import 'package:flutter/material.dart';

import '../studio_ui.dart';

class OverlayPreset {
  final String brandLine;
  final String breakingTitle;
  final String ticker;
  final String logoPosition;
  const OverlayPreset({
    this.brandLine = 'বাংলার ভয়েস | সরাসরি',
    this.breakingTitle = '',
    this.ticker = '',
    this.logoPosition = 'উপরে-বাম',
  });
}

class BrandingOverlayEditor extends StatefulWidget {
  const BrandingOverlayEditor({super.key});

  @override
  State<BrandingOverlayEditor> createState() => _BrandingOverlayEditorState();
}

class _BrandingOverlayEditorState extends State<BrandingOverlayEditor> {
  final _title = TextEditingController();
  final _ticker = TextEditingController();
  String _logoPosition = 'উপরে-বাম';

  static const _positions = ['উপরে-বাম', 'উপরে-ডান', 'নিচে-বাম', 'নিচে-ডান'];

  @override
  void dispose() {
    _title.dispose();
    _ticker.dispose();
    super.dispose();
  }

  void _done() {
    Navigator.of(context).pop(
      OverlayPreset(
        breakingTitle: _title.text.trim(),
        ticker: _ticker.text.trim(),
        logoPosition: _logoPosition,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF060D1E),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A1931),
        title: const Text('ব্র্যান্ডিং ওভারলে এডিটর'),
        actions: [
          TextButton(onPressed: _done, child: const Text('প্রয়োগ করুন', style: TextStyle(fontWeight: FontWeight.w700))),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('লাইভ প্রিভিউ', style: TextStyle(fontSize: 12, color: Colors.white54, fontWeight: FontWeight.w700, letterSpacing: 1)),
          const SizedBox(height: 8),
          // Overlay preview canvas
          Container(
            height: 190,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF1B2B4B), Color(0xFF0A1931)]),
            ),
            child: Stack(
              children: [
                // Logo position marker
                Positioned(
                  left: _logoPosition == 'উপরে-বাম' || _logoPosition == 'নিচে-বাম' ? 10 : null,
                  right: _logoPosition == 'উপরে-ডান' || _logoPosition == 'নিচে-ডান' ? 10 : null,
                  top: _logoPosition == 'উপরে-বাম' || _logoPosition == 'উপরে-ডান' ? 10 : null,
                  bottom: _logoPosition == 'নিচে-বাম' || _logoPosition == 'নিচে-ডান' ? 10 : null,
                  child: Container(
                    width: 44,
                    height: 22,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .9),
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: const Center(
                      child: Text('বাংলার ভয়েস', style: TextStyle(fontSize: 7, fontWeight: FontWeight.w800, color: Color(0xFFCC0000))),
                    ),
                  ),
                ),
                // Lower third
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                    color: const Color(0xE60A1931),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(color: studioRed, borderRadius: BorderRadius.circular(4)),
                              child: const Text('সরাসরি', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.white)),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'বাংলার ভয়েস | সরাসরি',
                              style: TextStyle(fontSize: 10, letterSpacing: 1, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: .85)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _title.text.trim().isEmpty ? 'ব্রেকিং টাইটেল লিখুন…' : _title.text.trim(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white, height: 1.2),
                        ),
                      ],
                    ),
                  ),
                ),
                // Bottom ticker strip
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 64),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    color: const Color(0xFFCC0000),
                    child: Text(
                      _ticker.text.trim().isEmpty ? 'ব্রেকিং টিকার — নিচে লিখুন' : _ticker.text.trim(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text('ব্রেকিং টাইটেল (বাংলা)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          TextField(
            controller: _title,
            maxLines: 2,
            onChanged: (_) => setState(() {}),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            decoration: const InputDecoration(
              hintText: 'যেমন: পদ্মা সেতুতে যানবাহন চলাচল স্বাভাবিক',
              filled: true,
              fillColor: Color(0xFF13203B),
              border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
            ),
          ),
          const SizedBox(height: 16),
          const Text('লাইভ টিকার টেক্সট', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          TextField(
            controller: _ticker,
            onChanged: (_) => setState(() {}),
            style: const TextStyle(fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'টিকার বার্তা (নিচে লাল বারে স্ক্রল করবে)',
              filled: true,
              fillColor: Color(0xFF13203B),
              border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
            ),
          ),
          const SizedBox(height: 16),
          const Text('লোগোর অবস্থান', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            children: _positions
                .map((p) => ChoiceChip(
                      label: Text(p),
                      selected: _logoPosition == p,
                      onSelected: (_) => setState(() => _logoPosition = p),
                      selectedColor: studioRed,
                      labelStyle: TextStyle(
                        color: _logoPosition == p ? Colors.white : Colors.white70,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                      backgroundColor: const Color(0xFF13203B),
                      side: BorderSide(color: _logoPosition == p ? studioRed : Colors.white12),
                    ))
                .toList(),
          ),
          const SizedBox(height: 20),
          const NotWiredChip(text: 'কম্পোজিট: এনকোডার-পাইপলাইনে ওভারলে বার্ন-ইন হবে (রিয়েল-টাইম)'),
        ],
      ),
    );
  }
}
