import 'dart:async';
import 'package:flutter/material.dart';
import '../models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets.dart';

class LiveScreen extends StatefulWidget {
  const LiveScreen({super.key});
  @override
  State<LiveScreen> createState() => _LiveScreenState();
}

class _LiveScreenState extends State<LiveScreen> {
  final _api = ApiService();
  List<LiveEntry> _entries = [];
  bool _loading = true;
  bool _error = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    // Live coverage: poll every 45 seconds.
    _timer = Timer.periodic(
      const Duration(seconds: 45),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (silent && !mounted) return;
    if (!silent) {
      setState(() {
        _loading = true;
        _error = false;
      });
    }
    try {
      final entries = await _api.fetchLive();
      if (!mounted) return;
      setState(() {
        _entries = entries;
        _loading = false;
        _error = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: BvColors.primary,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            const Text('লাইভ'),
          ],
        ),
      ),
      body: _loading
          ? const BvLoading(label: 'লাইভ আপডেট আনা হচ্ছে…')
          : _error
          ? BvError(
              message:
                  'লাইভ ফিড পাওয়া যাচ্ছে না। নেটওয়ার্ক বা সার্ভার দেখুন।',
              onRetry: _load,
            )
          : RefreshIndicator(
              onRefresh: () => _load(silent: false),
              child: _entries.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 120),
                        BvEmpty(
                          title: 'এখন কোনো লাইভ নেই',
                          subtitle:
                              'ব্রেকিং মুহূর্তে এখানে রিয়েল-টাইম আপডেট আসবে',
                        ),
                      ],
                    )
                  : ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: _entries.length,
                      separatorBuilder: (_, __) => Divider(
                        height: 1,
                        color: Theme.of(context).dividerColor,
                      ),
                      itemBuilder: (context, i) {
                        final e = _entries[i];
                        return NewsCard(
                          title: e.bodyBn,
                          category: 'লাইভ',
                          live: true,
                          timeLabel:
                              '${e.createdAt.hour.toString().padLeft(2, '0')}:${e.createdAt.minute.toString().padLeft(2, '0')}',
                          author: e.author,
                          onTap: () {},
                        );
                      },
                    ),
            ),
    );
  }
}
