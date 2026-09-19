import 'package:flutter/material.dart';
import 'package:bv_shared/bv_shared.dart';
import 'package:video_player/video_player.dart';

import '../config.dart';
import '../models/channel.dart';
import '../models/schedule.dart';
import '../services/api_service.dart';
import '../services/video_service.dart';

class TvHome extends StatefulWidget {
  const TvHome({super.key});

  @override
  State<TvHome> createState() => _TvHomeState();
}

class _TvHomeState extends State<TvHome> {
  final _api = TvApiService();
  final _video = TvVideoService();

  List<TvChannel> _channels = TvChannel.fallback;
  TvChannel? _current;
  List<ScheduleEntry> _schedule = ScheduleEntry.fallback;
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
    final channels = await _api.fetchChannels();
    final schedule = await _api.fetchSchedule();
    if (!mounted) return;
    setState(() {
      _channels = channels;
      _schedule = schedule;
      _loading = false;
    });
    if (channels.isNotEmpty) {
      await _selectChannel(channels.first);
    }
  }

  Future<void> _selectChannel(TvChannel c) async {
    if (!c.isVideo) {
      // Audio handled by TvAudioService (already wired in previous version)
      setState(() => _current = c);
      return;
    }
    final ok = await _video.load(c.streamUrl);
    if (!mounted) return;
    setState(() {
      _current = c;
      _error = ok ? null : 'স্ট্রিম লোড করা যায়নি';
    });
  }

  @override
  void dispose() {
    _video.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  _ticker(),
                  Expanded(
                    child: Row(
                      children: [
                        Expanded(flex: 3, child: _videoPanel()),
                        Expanded(flex: 2, child: _sidebar()),
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
              '${localeNotifier.t('live_title')}: ${_current?.nameBn ?? localeNotifier.t('tv_main_channel')}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),
          _languageToggle(),
        ],
      ),
    );
  }

  Widget _languageToggle() {
    return PopupMenuButton<AppLocale>(
      icon: const Icon(Icons.language, color: Colors.white, size: 22),
      tooltip: localeNotifier.t('settings_language'),
      onSelected: (loc) => localeNotifier.set(loc),
      itemBuilder: (ctx) => [
        PopupMenuItem(
          value: AppLocale.bn,
          child: Row(
            children: [
              if (localeNotifier.current == AppLocale.bn)
                const Icon(Icons.check, size: 18)
              else
                const SizedBox(width: 18),
              const SizedBox(width: 8),
              const Text('বাংলা'),
            ],
          ),
        ),
        PopupMenuItem(
          value: AppLocale.en,
          child: Row(
            children: [
              if (localeNotifier.current == AppLocale.en)
                const Icon(Icons.check, size: 18)
              else
                const SizedBox(width: 18),
              const SizedBox(width: 8),
              const Text('English'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _videoPanel() {
    return Container(
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: _video.isReady
            ? AspectRatio(
                aspectRatio: _video.controller!.value.aspectRatio,
                child: VideoPlayer(_video.controller!),
              )
            : Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.tv, color: Colors.white30, size: 80),
                    const SizedBox(height: 16),
                    Text(
                      _error ?? localeNotifier.t('tv_choose_channel'),
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _sidebar() {
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
            localeNotifier.t('tv_channel'),
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            flex: 1,
            child: ListView.builder(
              itemCount: _channels.length,
              itemBuilder: (_, i) {
                final c = _channels[i];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    c.isVideo ? Icons.tv : Icons.radio,
                    color: _current?.id == c.id
                        ? Colors.redAccent
                        : Colors.white54,
                  ),
                  title: Text(
                    c.nameBn,
                    style: TextStyle(
                      color: _current?.id == c.id
                          ? Colors.redAccent
                          : Colors.white,
                      fontWeight: _current?.id == c.id
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  onTap: () => _selectChannel(c),
                );
              },
            ),
          ),
          const Divider(color: Colors.white24),
          const Text(
            localeNotifier.t('tv_today_broadcast'),
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            flex: 2,
            child: ListView.builder(
              itemCount: _schedule.length,
              itemBuilder: (_, i) {
                final e = _schedule[i];
                return ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    e.isNow ? Icons.play_circle : Icons.schedule,
                    color: e.isNow ? Colors.redAccent : Colors.white54,
                  ),
                  title: Text(
                    e.title,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight:
                          e.isNow ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  trailing: Text(
                    e.time,
                    style: const TextStyle(color: Colors.white54),
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
