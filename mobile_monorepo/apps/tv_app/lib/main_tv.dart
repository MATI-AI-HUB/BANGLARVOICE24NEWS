/// Banglar Voice — Smart TV & Audio Broadcast Streamer (entrypoint).
/// Android TV / tablet landscape UI, 24-hour audio stream player with
/// auto-scrolling breaking-news ticker.
import 'package:flutter/material.dart';

void main() => runApp(const BvTvApp());

class BvTvApp extends StatelessWidget {
  const BvTvApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'বাংলার ভয়েস টিভি',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFFC41E1E),
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      home: const TvHome(),
    );
  }
}

class TvHome extends StatefulWidget {
  const TvHome({super.key});

  @override
  State<TvHome> createState() => _TvHomeState();
}

class _TvHomeState extends State<TvHome> {
  bool _playing = false;
  int _ticker = 0;

  static const _headlines = [
    'ঢাকায় মেট্রোরেলের নতুন রুট উদ্বোধন আজ',
    'পদ্মা সেতু দিয়ে রেকর্ড যানবাহন পারাপার',
    'জাতীয় সংসদে নতুন বাজেট পেশ',
    'আন্তর্জাতিক ক্রিকেটে বাংলাদেশের বড় জয়',
  ];

  @override
  void initState() {
    super.initState();
    // Auto-scrolling breaking-news ticker.
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 6));
      if (!mounted) return false;
      setState(() => _ticker = (_ticker + 1) % _headlines.length);
      return true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: SafeArea(
        child: Column(
          children: [
            // Breaking ticker bar
            Container(
              width: double.infinity,
              color: const Color(0xFFC41E1E),
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'ব্রেকিং: ${_headlines[_ticker]}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            Expanded(
              child: Row(
                children: [
                  // Player panel
                  Expanded(
                    flex: 3,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 240,
                            height: 240,
                            decoration: BoxDecoration(
                              color: const Color(0xFFC41E1E),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFFC41E1E).withValues(alpha: .4),
                                  blurRadius: 60,
                                  spreadRadius: 8,
                                ),
                              ],
                            ),
                            child: Icon(
                              _playing ? Icons.graphic_eq : Icons.play_arrow_rounded,
                              color: Colors.white,
                              size: 110,
                            ),
                          ),
                          const SizedBox(height: 36),
                          Text(
                            'বাংলার ভয়েস ২৪/৭ অডিও',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _playing ? 'লাইভ স্ট্রিম চলছে' : 'ট্যাপ করে চালু করুন',
                            style: const TextStyle(color: Colors.white54, fontSize: 18),
                          ),
                          const SizedBox(height: 28),
                          FilledButton.icon(
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 20),
                              textStyle: const TextStyle(fontSize: 22),
                            ),
                            onPressed: () => setState(() => _playing = !_playing),
                            icon: Icon(_playing ? Icons.stop : Icons.play_arrow),
                            label: Text(_playing ? 'থামান' : 'চালু করুন'),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Stream URL: https://stream.banglarvoice.com/live (আসল URL বসান)',
                            style: TextStyle(color: Colors.white38, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Right rail: next segments / schedule
                  Expanded(
                    flex: 2,
                    child: Container(
                      margin: const EdgeInsets.all(24),
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: .06),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'আজকের সম্প্রচার',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          for (final (t, name) in [
                            ('০৬:০০', 'সকালের সংবাদ'),
                            ('০৯:০০', 'অর্থনীতি ডেস্ক'),
                            ('১২:০০', 'মধ্যাহ্ন সংবাদ'),
                            ('১৫:০০', 'খেলাধুলা'),
                            ('১৮:০০', 'প্রধান সংবাদ'),
                            ('২১:০০', 'রাতের সংবাদ'),
                          ])
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.schedule, color: Colors.white54),
                              title: Text(name, style: const TextStyle(fontSize: 20)),
                              trailing: Text(t, style: const TextStyle(color: Colors.white54, fontSize: 18)),
                            ),
                        ],
                      ),
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
}
