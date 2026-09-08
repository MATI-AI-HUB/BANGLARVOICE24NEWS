import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';
import '../widgets.dart';
import 'article_detail_screen.dart';

/// Saved tab: bookmarked articles persisted via SharedPreferences.
class SavedScreen extends StatefulWidget {
  const SavedScreen({super.key});

  @override
  State<SavedScreen> createState() => _SavedScreenState();
}

class _SavedScreenState extends State<SavedScreen> {
  static const String _key = 'saved_urls';
  late final ApiService _api;
  late Future<FeedResult> _future;
  List<String> _saved = [];
  bool _fromCache = false;

  @override
  void initState() {
    super.initState();
    _api = ApiService();
    _future = _api.fetchFeed();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() => _saved = prefs.getStringList(_key) ?? []);
    }
  }

  Future<void> _refresh() async {
    await _loadSaved();
    final f = _api.fetchFeed();
    setState(() => _future = f);
    try {
      final res = await f;
      if (mounted && res.fromCache != _fromCache) {
        setState(() => _fromCache = res.fromCache);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: BvHeader(title: 'সংরক্ষিত'),
      body: FutureBuilder<FeedResult>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const FeedSkeleton();
          }
          if (snap.hasError) {
            final err = snap.error;
            final msg = err is FetchException
                ? err.message
                : '${err ?? 'অজানা ত্রুটি'}';
            return BvError(message: msg, onRetry: _refresh);
          }
          final result = snap.data;
          final fromCache = result?.fromCache ?? false;
          final items = (result?.feed.items ?? [])
              .where((e) => _saved.contains(e.url))
              .toList();
          if (items.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (fromCache)
                    BvOfflineBanner(attempts: result?.attempts ?? 1),
                  const SizedBox(height: 100),
                  const BvEmpty(
                    title: 'কোনো সংবাদ সংরক্ষিত নেই',
                    subtitle: 'আর্টিকেলে bookmark আইকনে চাপ দিন',
                  ),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: items.length,
              separatorBuilder: (_, __) =>
                  Divider(height: 1, color: Theme.of(context).dividerColor),
              itemBuilder: (context, i) {
                final e = items[i];
                return NewsCard(
                  title: e.title,
                  category: e.categoryLabel,
                  timeLabel: e.publishedLabel,
                  author: e.authorName,
                  live: e.isLiveLike,
                  imageUrl: e.imageUrl,
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ArticleDetailScreen(item: e),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
