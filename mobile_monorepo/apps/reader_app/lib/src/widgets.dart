import 'package:flutter/material.dart';
import 'theme.dart';

/// Shared Bengali state widgets used across every tab.

class BvLoading extends StatelessWidget {
  const BvLoading({super.key, this.label = 'লোড হচ্ছে…'});
  final String label;
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 26,
            height: 26,
            child: CircularProgressIndicator(strokeWidth: 2.6),
          ),
          const SizedBox(height: 12),
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class BvError extends StatelessWidget {
  const BvError({
    super.key,
    required this.message,
    this.onRetry,
    this.title = 'সংযোগ বিচ্ছিন্ন',
  });
  final String title;
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 44, color: scheme.primary),
            const SizedBox(height: 12),
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('আবার চেষ্টা করুন'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class BvEmpty extends StatelessWidget {
  const BvEmpty({super.key, required this.title, this.subtitle});
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.newspaper_rounded,
              size: 44,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Category pill shown on cards.
class CategoryTag extends StatelessWidget {
  const CategoryTag({super.key, required this.label, this.live = false});
  final String label;
  final bool live;

  @override
  Widget build(BuildContext context) {
    final bg = live
        ? BvColors.primary
        : (Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF2A2825)
              : BvColors.muted);
    final fg = live
        ? Colors.white
        : (Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFFF2EEE6)
              : BvColors.ink);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (live) ...[
            Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: fg,
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}

/// Slim banner shown when the feed came from the offline cache.
class BvOfflineBanner extends StatelessWidget {
  const BvOfflineBanner({super.key, this.attempts = 1});
  final int attempts;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      color: scheme.tertiaryContainer.withValues(alpha: 0.7),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      child: Row(
        children: [
          Icon(
            Icons.cloud_off_rounded,
            size: 15,
            color: scheme.onTertiaryContainer,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'ইন্টারনেট নেই — সংরক্ষিত কপি দেখানো হচ্ছে'
              '${attempts > 1 ? ' ($attempts বার চেষ্টার পর)' : ''}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: scheme.onTertiaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// App-brand top bar used by every screen: logo block + [trailing] actions.
class BvHeader extends StatelessWidget implements PreferredSizeWidget {
  const BvHeader({super.key, this.title, this.trailing, this.bottom});
  final String? title;
  final Widget? trailing;
  final PreferredSizeWidget? bottom;

  @override
  Size get preferredSize =>
      Size.fromHeight(kToolbarHeight + (bottom?.preferredSize.height ?? 0));

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final scheme = Theme.of(context).colorScheme;
    return AppBar(
      backgroundColor: dark ? const Color(0xFF1D1C1A) : Colors.white,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleSpacing: 16,
      bottom: bottom,
      title: title != null
          ? Text(
              title!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: dark ? const Color(0xFFF2EEE6) : BvColors.ink,
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: BvColors.primary,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Center(
                    child: Text(
                      'ব',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'বাংলার ভয়েস',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 1.5,
                  ),
                  decoration: BoxDecoration(
                    color: scheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(3),
                  ),
                  child: Text(
                    'বিটা',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: scheme.primary,
                    ),
                  ),
                ),
              ],
            ),
      actions: [if (trailing != null) trailing!, const SizedBox(width: 4)],
    );
  }
}

/// Bengali section title: "সর্বশেষ সংবাদ" style label row.
class BvSectionTitle extends StatelessWidget {
  const BvSectionTitle({super.key, required this.title, this.actionLabel});
  final String title;
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 10),
      child: Row(
        children: [
          Container(
            width: 3.5,
            height: 16,
            decoration: BoxDecoration(
              color: BvColors.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.2,
              color: Theme.of(context).brightness == Brightness.dark
                  ? const Color(0xFFF2EEE6)
                  : BvColors.ink,
            ),
          ),
          if (actionLabel != null) ...[
            const Spacer(),
            Text(
              actionLabel!,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: scheme.primary,
              ),
            ),
            const SizedBox(width: 2),
            Icon(Icons.chevron_right_rounded, size: 16, color: scheme.primary),
          ],
        ],
      ),
    );
  }
}

/// Pulsing red dot used by live / breaking labels.
class LiveDot extends StatelessWidget {
  const LiveDot({super.key, this.size = 7, this.color = BvColors.primary});
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      child: Center(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.45),
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }
}

/// News row used on Latest + Live screens.
class NewsCard extends StatelessWidget {
  const NewsCard({
    super.key,
    required this.title,
    required this.category,
    required this.timeLabel,
    this.author,
    this.onTap,
    this.live = false,
    this.imageUrl,
  });

  final String title;
  final String category;
  final String timeLabel;
  final String? author;
  final VoidCallback? onTap;
  final bool live;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CategoryTag(label: category, live: live),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          timeLabel,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: scheme.outline,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 7),
                  Text(
                    title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (author != null && author!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      author!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: scheme.primary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (imageUrl != null && imageUrl!.isNotEmpty) ...[
              const SizedBox(width: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 104,
                  height: 82,
                  child: Image.network(
                    imageUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        _thumbFallback(context, scheme),
                    loadingBuilder: (context, child, progress) {
                      if (progress == null) return child;
                      return Container(
                        color: dark ? const Color(0xFF2A2825) : BvColors.muted,
                      );
                    },
                  ),
                ),
              ),
            ] else ...[
              const SizedBox(width: 8),
              Icon(
                Icons.chevron_right_rounded,
                color: scheme.outlineVariant,
                size: 20,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _thumbFallback(BuildContext context, ColorScheme scheme) {
    return Container(
      color: Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFF2A2825)
          : BvColors.muted,
      child: Icon(Icons.image_outlined, size: 20, color: scheme.outline),
    );
  }
}

/// Featured wide card (full-bleed image) used at the top of the home feed.
class HeroArticleCard extends StatelessWidget {
  const HeroArticleCard({
    super.key,
    required this.title,
    required this.category,
    required this.timeLabel,
    this.imageUrl,
    this.author,
    this.onTap,
    this.live = false,
  });

  final String title;
  final String category;
  final String timeLabel;
  final String? imageUrl;
  final String? author;
  final VoidCallback? onTap;
  final bool live;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 6),
      decoration: BoxDecoration(
        color: dark ? const Color(0xFF1D1C1A) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: dark ? const Color(0xFF33302C) : BvColors.line,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: dark ? 0.3 : 0.05),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: imageUrl != null && imageUrl!.isNotEmpty
                  ? Image.network(
                      imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          _fallback(context, scheme, showPlay: false),
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Container(
                          color: dark
                              ? const Color(0xFF26231F)
                              : BvColors.muted,
                          child: const Center(
                            child: SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        );
                      },
                    )
                  : _fallback(context, scheme, showPlay: false),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CategoryTag(label: category, live: live),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          timeLabel,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: scheme.outline,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 19,
                      height: 1.35,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (author != null && author!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.person_outline_rounded,
                          size: 13,
                          color: scheme.primary,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          author!,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: scheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _fallback(
    BuildContext context,
    ColorScheme scheme, {
    required bool showPlay,
  }) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      color: dark ? const Color(0xFF26231F) : const Color(0xFFEFEAE0),
      child: Center(
        child: showPlay
            ? Icon(
                Icons.play_circle_outline_rounded,
                size: 40,
                color: scheme.outlineVariant,
              )
            : Icon(
                Icons.article_outlined,
                size: 34,
                color: scheme.outlineVariant,
              ),
      ),
    );
  }
}

/// Lightweight shimmer-like skeleton shown while the feed is loading.
class FeedSkeleton extends StatelessWidget {
  const FeedSkeleton({super.key, this.cards = 5});
  final int cards;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final base = dark ? const Color(0xFF26231F) : const Color(0xFFEFEAE0);
    Widget bar(double width, double height) => Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: base,
        borderRadius: BorderRadius.circular(4),
      ),
    );
    return ListView.builder(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: cards,
      itemBuilder: (_, i) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  bar(70, 14),
                  const SizedBox(height: 9),
                  bar(double.infinity, 15),
                  const SizedBox(height: 6),
                  bar(180, 15),
                  const SizedBox(height: 9),
                  bar(90, 11),
                ],
              ),
            ),
            const SizedBox(width: 14),
            Container(
              width: 104,
              height: 86,
              decoration: BoxDecoration(
                color: base,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
