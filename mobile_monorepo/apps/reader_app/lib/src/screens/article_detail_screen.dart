import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets.dart';

class ArticleDetailScreen extends StatelessWidget {
  const ArticleDetailScreen({super.key, required this.item});
  final FeedItem item;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final paragraphs = (item.contentText ?? '')
        .split(RegExp(r'\n\s*\n'))
        .map((p) => p.trim())
        .where((p) => p.isNotEmpty)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('বাংলার ভয়েস'),
        leading: BackButton(color: scheme.primary),
        actions: [
          _BookmarkButton(item: item),
          IconButton(
            tooltip: 'শেয়ার করুন',
            onPressed: () async {
              final url = item.url.isNotEmpty
                  ? item.url
                  : '${AppConfig.defaultApiBase}/news';
              await launchUrl(
                Uri.parse(url),
                mode: LaunchMode.externalApplication,
              );
            },
            icon: const Icon(Icons.share_outlined, size: 21),
          ),
          IconButton(
            tooltip: 'ব্রাউজারে খুলুন',
            onPressed: () async {
              final url = item.url.isNotEmpty
                  ? item.url
                  : '${AppConfig.defaultApiBase}/news';
              await launchUrl(
                Uri.parse(url),
                mode: LaunchMode.externalApplication,
              );
            },
            icon: const Icon(Icons.open_in_new_rounded, size: 20),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          if (item.hasImage) ...[
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Image.network(
                item.imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: dark
                      ? const Color(0xFF26231F)
                      : const Color(0xFFEFEAE0),
                ),
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return Container(
                    color: dark ? const Color(0xFF26231F) : BvColors.muted,
                    child: const Center(
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CategoryTag(
                      label: item.categoryLabel,
                      live: item.isLiveLike,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        item.publishedLabel,
                        style: TextStyle(fontSize: 12, color: scheme.outline),
                      ),
                    ),
                    if (item.readTimeLabel.isNotEmpty)
                      Text(
                        '• ${item.readTimeLabel}',
                        style: TextStyle(fontSize: 12, color: scheme.outline),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  item.title,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontSize: 26,
                    height: 1.32,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (item.summary != null && item.summary!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: dark ? const Color(0xFF26231F) : BvColors.muted,
                      borderRadius: BorderRadius.circular(8),
                      border: Border(
                        left: BorderSide(color: BvColors.primary, width: 3),
                      ),
                    ),
                    child: Text(
                      item.summary!,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: scheme.primary,
                        fontWeight: FontWeight.w700,
                        height: 1.6,
                      ),
                    ),
                  ),
                ],
                if (item.authorName != null && item.authorName!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 17,
                        backgroundColor: scheme.primary.withValues(alpha: 0.12),
                        child: Text(
                          item.authorName!.characters.first,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: BvColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.authorName!,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            'বাংলার ভয়েস',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: scheme.outline,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),
                const Divider(height: 1),
                const SizedBox(height: 20),
                if (paragraphs.isEmpty)
                  const BvEmpty(
                    title: 'সম্পূর্ণ লেখা শিগগিরই',
                    subtitle: 'বিস্তারিত পড়তে ওয়েবসাইটে যান',
                  )
                else
                  ...paragraphs.map(
                    (p) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(
                        p,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontSize: 17,
                          height: 1.9,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                Center(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final url = item.url.isNotEmpty
                          ? item.url
                          : '${AppConfig.defaultApiBase}/news';
                      await launchUrl(
                        Uri.parse(url),
                        mode: LaunchMode.externalApplication,
                      );
                    },
                    icon: const Icon(Icons.open_in_new_rounded, size: 16),
                    label: const Text('ওয়েবসাইটে পড়ুন'),
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    '© 2026 বাংলার ভয়েস',
                    style: TextStyle(fontSize: 11.5, color: scheme.outline),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Bookmark toggle persisted to SharedPreferences under 'saved_urls'.
class _BookmarkButton extends StatefulWidget {
  const _BookmarkButton({required this.item});
  final FeedItem item;

  @override
  State<_BookmarkButton> createState() => _BookmarkButtonState();
}

class _BookmarkButtonState extends State<_BookmarkButton> {
  static const String _key = 'saved_urls';
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    if (mounted) {
      setState(() => _saved = list.contains(widget.item.url));
    }
  }

  Future<void> _toggle() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    final url = widget.item.url;
    final exists = list.contains(url);
    final next = List<String>.from(list);
    if (exists) {
      next.remove(url);
    } else {
      next.add(url);
    }
    await prefs.setStringList(_key, next);
    if (mounted) {
      setState(() => _saved = !exists);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return IconButton(
      tooltip: _saved ? 'সংরক্ষিত' : 'পরে পড়ুন',
      onPressed: _toggle,
      icon: Icon(
        _saved ? Icons.bookmark_rounded : Icons.bookmark_outline_rounded,
        color: _saved ? scheme.primary : null,
      ),
    );
  }
}
