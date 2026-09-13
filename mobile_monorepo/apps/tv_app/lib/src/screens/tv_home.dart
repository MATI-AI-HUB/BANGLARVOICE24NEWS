import 'package:flutter/material.dart';

import '../config.dart';
import '../models/schedule.dart';
import '../models/stream.dart';
import '../services/api_service.dart';
import '../services/audio_service.dart';

class TvHome extends StatefulWidget {
  const TvHome({super.key});

  @override
  State<TvHome> createState() => _TvHomeState();
}

class _TvHomeState extends State<TvHome> {
  final _api = TvApiService();
  final _audio = TvAudioService();

  StreamInfo _stream = StreamInfo.empty;
  List<ScheduleEntry> _schedule = ScheduleEntry.fallback;
  bool _playing = false;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final stream = await _api.fetchStream();
    final schedule = await _api.fetchSchedule();
    if (!mounted) return;
    setState(() {
      _stream = stream;
      _schedule = schedule;
      _loading = false;
    });
  }

  Future<void> _toggle() async {
    if (_playing) {
      await _audio.pause();
      if (!mounted) return;
      setState(() => _playing = false);
      return;
    }
    if (_stream.streamUrl.isEmpty) {
      // Try reload
      await _bootstrap();
      if (_stream.streamUrl.isEmpty) {
        setState(() => _error = 'স্ট্রিম URL পাওয়া যায়নি');
        return;
      }
    }
    await _audio.load(_stream.streamUrl);
    await _audio.play();
    if (!mounted) return;
    setState(() => _playing = true);
  }

  @override
  void dispose() {
    _audio.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: SafeArea(
        child: Column(
          children: [
            _ticker(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : Row(
                      children: [
                        Expanded(flex: 3, child: _playerPanel()),
                        Expanded(flex: 2, child: _schedulePanel()),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ticker() {
    return Container(
      width: double.infinity,
      color: const Color(0xFFC41E1E),
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      child: Row(
        children: [
          const Icon(Icons.circle, color: Colors.white, size: 14),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _stream.nowPlaying.isEmpty
                  ? 'বাংলার ভয়েস ২৪/৭ — সংযোগ তৈরি হচ্ছে…'
                  : 'লাইভ: ${_stream.nowPlaying}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _playerPanel() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 220,
            height: 220,
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
              size: 100,
            ),
          ),
          const SizedBox(height: 28),
          Text(
            _stream.title,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _playing ? 'লাইভ স্ট্রিম চলছে' : 'ট্যাপ করে চালু করুন',
            style: const TextStyle(color: Colors.white54, fontSize: 16),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(color: Colors.orangeAccent, fontSize: 14),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 18),
              textStyle: const TextStyle(fontSize: 20),
            ),
            onPressed: _toggle,
            icon: Icon(_playing ? Icons.stop : Icons.play_arrow),
            label: Text(_playing ? 'থামান' : 'চালু করুন'),
          ),
          const SizedBox(height: 10),
          Text(
            TvConfig.currentBase,
            style: const TextStyle(color: Colors.white24, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _schedulePanel() {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .05),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'আজকের সম্প্রচার',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              itemCount: _schedule.length,
              itemBuilder: (context, i) {
                final e = _schedule[i];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    e.isNow ? Icons.play_circle : Icons.schedule,
                    color: e.isNow ? Colors.redAccent : Colors.white54,
                  ),
                  title: Text(
                    e.title,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight:
                          e.isNow ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  trailing: Text(
                    e.time,
                    style: const TextStyle(
                      color: Colors.white54,
                      fontSize: 15,
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
