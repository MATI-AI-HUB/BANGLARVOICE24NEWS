import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../theme.dart';
import '../widgets.dart';
import 'article_detail_screen.dart';

/// Categories tab: browse by topic.
class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  static const List<String> _categories = [
    'রাজনীতি',
    'অর্থনীতি',
    'খেলাধুলা',
    'বিনোদন',
    'আন্তর্জাতিক',
    'বিশ্লেষণ',
    'লাইভ',
    'ভিডিও',
  ];

  static const Map<String, IconData> _icons = {
    'রাজনীতি': Icons.account_balance_outlined,
    'অর্থনীতি': Icons.trending_up_rounded,
    'খেলাধুলা': Icons.sports_soccer_rounded,
    'বিনোদন': Icons.movie_outlined,
    'আন্তর্জাতিক': Icons.public_rounded,
    'বিশ্লেষণ': Icons.insights_rounded,
    'লাইভ': Icons.sensors_rounded,
    'ভিডিও': Icons.play_circle_outline_rounded,
  };

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: BvHeader(title: 'ক্যাটাগরি'),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.7,
        children: _categories.map((c) {
          final icon = _icons[c] ?? Icons.folder_outlined;
          final scheme = Theme.of(context).colorScheme;
          return Material(
            color: dark ? const Color(0xFF26231F) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CategoryFeedScreen(category: c),
                ),
              ),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: dark ? const Color(0xFF33302C) : BvColors.line,
                  ),
                ),
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: BvColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(icon, size: 20, color: BvColors.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        c,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: scheme.outlineVariant,
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Filtered feed shown after tapping a category.
class CategoryFeedScreen extends StatefulWidget {
  const CategoryFeedScreen({super.key, required this.category});
  final String category;

  @override
  State<CategoryFeedScreen> createState() => _CategoryFeedScreenState();
}

class _CategoryFeedScreenState extends State<CategoryFeedScreen> {
  final ApiService _api = ApiService();
  late Future<FeedResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _api.fetchFeed();
  }

  Future<void> _refresh() async {
    final f = _api.fetchFeed();
    setState(() => _future = f);
    try {
      await f;
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: BvHeader(title: widget.category),
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
          final label = widget.category;
          final items = (result?.feed.items ?? [])
              .where(
                (e) =>
                    e.tags.any((t) => t.contains(label)) ||
                    e.categoryLabel == label,
              )
              .toList();
          if (items.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  if (fromCache)
                    BvOfflineBanner(attempts: result?.attempts ?? 1),
                  const SizedBox(height: 120),
                  const BvEmpty(
                    title: 'এই ক্যাটাগরিতে এখনো পোস্ট নেই',
                    subtitle: 'শীঘ্রই আসছে — অন্য ক্যাটাগরি দেখুন',
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
