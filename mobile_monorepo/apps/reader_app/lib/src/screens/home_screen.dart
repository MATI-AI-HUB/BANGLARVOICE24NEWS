import 'dart:async';

import 'package:flutter/material.dart';

import '../models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets.dart';
import 'article_detail_screen.dart';
import 'settings_screen.dart';

/// Home feed: hero + breaking ticker + category chips + latest list.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final ApiService _api;
  late Future<FeedResult> _future;
  int _selectedCategory = 0;
  bool _fromCache = false;

  static const List<Map<String, String>> _categories = [
    {'key': '', 'label': 'সর্বশেষ'},
    {'key': 'national', 'label': 'জাতীয়'},
    {'key': 'politics', 'label': 'রাজনীতি'},
    {'key': 'economy', 'label': 'অর্থনীতি'},
    {'key': 'sports', 'label': 'খেলাধুলা'},
    {'key': 'entertainment', 'label': 'বিনোদন'},
    {'key': 'tech', 'label': 'প্রযুক্তি'},
    {'key': 'health', 'label': 'স্বাস্থ্য'},
    {'key': 'education', 'label': 'শিক্ষা'},
    {'key': 'international', 'label': 'আন্তর্জাতিক'},
    {'key': 'city', 'label': 'নগর'},
  ];

  @override
  void initState() {
    super.initState();
    _api = ApiService();
    _future = _api.fetchFeed();
  }

  Future<void> _refresh() async {
    // Force a live attempt (ignore cache) on explicit pull-to-refresh.
    final f = _api.fetchFeed(allowCache: true);
    setState(() {
      _future = f;
    });
    try {
      final res = await f;
      if (mounted && res.fromCache != _fromCache) {
        setState(() => _fromCache = res.fromCache);
      }
    } catch (_) {}
  }

  List<FeedItem> _visibleItems(List<FeedItem> items) {
    if (_selectedCategory == 0) return items;
    final cat = _categories[_selectedCategory];
    final key = cat['key']!.toLowerCase();
    final label = cat['label']!;
    return items.where((e) {
      final tags = e.tags.map((t) => t.toLowerCase()).toList();
      return tags.contains(key) || tags.contains(label);
    }).toList();
  }

  void _openSettings() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SettingsScreen(
          isDark: Theme.of(context).brightness == Brightness.dark,
          onDarkChanged: (_) {},
        ),
      ),
    );
  }

  void _open(FeedItem item) {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => ArticleDetailScreen(item: item)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: BvHeader(
        trailing: IconButton(
          tooltip: 'সেটিংস',
          onPressed: _openSettings,
          icon: const Icon(Icons.tune_rounded, size: 21),
        ),
      ),
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
          final all = result?.feed.items ?? [];
          final items = _visibleItems(all);
          final breaking = all.where((e) => e.isLiveLike).toList();
          final hero = all.isNotEmpty ? all.first : null;
          final fromCache = result?.fromCache ?? false;

          return RefreshIndicator(
            onRefresh: _refresh,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (fromCache)
                  SliverToBoxAdapter(
                    child: BvOfflineBanner(attempts: result?.attempts ?? 1),
                  ),
                if (all.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: BvEmpty(
                      title: 'কোনো সংবাদ নেই',
                      subtitle: 'টান দিয়ে রিফ্রেশ করুন',
                    ),
                  )
                else ...[
                  SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (breaking.isNotEmpty) _BreakingBar(items: breaking),
                        if (hero != null)
                          HeroArticleCard(
                            title: hero.title,
                            category: hero.categoryLabel,
                            timeLabel: hero.publishedLabel,
                            author: hero.authorName,
                            imageUrl: hero.imageUrl,
                            live: hero.isLiveLike,
                            onTap: () => _open(hero),
                          ),
                        _CategoryChips(
              categories: _categories.map((c) => c['label']!).toList(),
                          selected: _selectedCategory,
                          onSelected: (i) =>
                              setState(() => _selectedCategory = i),
                        ),
                        const BvSectionTitle(
                          title: 'সর্বশেষ সংবাদ',
                          actionLabel: 'সব দেখুন',
                        ),
                      ],
                    ),
                  ),
                  if (items.isEmpty)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: BvEmpty(
                        title: 'এই ক্যাটাগরিতে কোনো সংবাদ নেই',
                        subtitle: 'অন্য ক্যাটাগরি দেখুন',
                      ),
                    )
                  else
                    SliverList.separated(
                      itemCount: items.length,
                      separatorBuilder: (_, __) => Divider(
                        height: 1,
                        color: Theme.of(context).dividerColor,
                      ),
                      itemBuilder: (context, i) {
                        final item = items[i];
                        return NewsCard(
                          title: item.title,
                          category: item.categoryLabel,
                          timeLabel: item.publishedLabel,
                          author: item.authorName,
                          live: item.isLiveLike,
                          imageUrl: item.imageUrl,
                          onTap: () => _open(item),
                        );
                      },
                    ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _BreakingBar extends StatefulWidget {
  const _BreakingBar({required this.items});
  final List<FeedItem> items;

  @override
  State<_BreakingBar> createState() => _BreakingBarState();
}

class _BreakingBarState extends State<_BreakingBar> {
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (widget.items.length < 2) return;
      setState(() => _index = (_index + 1) % widget.items.length);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.items[_index % widget.items.length];
    return Container(
      color: BvColors.primary,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(3),
            ),
            child: const Text(
              'ব্রেকিং',
              style: TextStyle(
                color: BvColors.primary,
                fontSize: 10.5,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 350),
              child: Text(
                item.title,
                key: ValueKey<int>(_index),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),
          const LiveDot(color: Colors.white),
        ],
      ),
    );
  }
}

class _CategoryChips extends StatelessWidget {
  const _CategoryChips({
    required this.categories,
    required this.selected,
    required this.onSelected,
  });

  final List<String> categories;
  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      height: 46,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final active = i == selected;
          return ChoiceChip(
            label: Text(categories[i]),
            selected: active,
            onSelected: (_) => onSelected(i),
            showCheckmark: false,
            labelStyle: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: active
                  ? Colors.white
                  : dark
                  ? const Color(0xFFF2EEE6)
                  : BvColors.ink,
            ),
            selectedColor: BvColors.primary,
            backgroundColor: dark
                ? const Color(0xFF26231F)
                : const Color(0xFFF2EEE6),
            side: BorderSide(
              color: active
                  ? BvColors.primary
                  : dark
                  ? const Color(0xFF33302C)
                  : BvColors.line,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 6),
          );
        },
      ),
    );
  }
}
