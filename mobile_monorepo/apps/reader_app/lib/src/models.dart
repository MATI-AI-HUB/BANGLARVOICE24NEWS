/// Data models mirroring the JSON Feed (jsonfeed.org v1.1) served at
/// /api/public/feed.json by the Banglar Voice web app.
class Feed {
  final String version;
  final String title;
  final String homePageUrl;
  final String feedUrl;
  final String description;
  final String? language;
  final List<FeedItem> items;

  Feed({
    required this.version,
    required this.title,
    required this.homePageUrl,
    required this.feedUrl,
    required this.description,
    this.language,
    required this.items,
  });

  factory Feed.fromJson(Map<String, dynamic> json) {
    return Feed(
      version: json['version'] as String? ?? 'https://jsonfeed.org/version/1.1',
      title: json['title'] as String? ?? '',
      homePageUrl: json['home_page_url'] as String? ?? '',
      feedUrl: json['feed_url'] as String? ?? '',
      description: json['description'] as String? ?? '',
      language: json['language'] as String?,
      items: (json['items'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(FeedItem.fromJson)
          .toList(),
    );
  }
}

class FeedItem {
  final String id;
  final String url;
  final String title;
  final String? summary;
  final String? contentText;
  final String? datePublished;
  final List<String> tags;
  final String? authorName;
  final String? imageUrl;
  final double? biasIndex;
  final int? readTimeMinutes;

  FeedItem({
    required this.id,
    required this.url,
    required this.title,
    this.summary,
    this.contentText,
    this.datePublished,
    this.tags = const [],
    this.authorName,
    this.imageUrl,
    this.biasIndex,
    this.readTimeMinutes,
  });

  factory FeedItem.fromJson(Map<String, dynamic> json) {
    String? author;
    final authors = json['authors'];
    if (authors is List && authors.isNotEmpty) {
      final first = authors.first;
      if (first is Map && first['name'] != null) {
        author = first['name'] as String;
      } else if (first is String) {
        author = first;
      }
    }
    author ??= json['author'] as String?;
    final rawTags = json['tags'];
    List<String> tags = [];
    if (rawTags is List) {
      tags = rawTags.map((e) => e.toString()).toList();
    }
    // banner_image / image follows JSON Feed 1.1 conventions.
    String? image;
    final bi = json['banner_image'];
    if (bi is String && bi.isNotEmpty) {
      image = bi;
    } else {
      final img = json['image'];
      if (img is String && img.isNotEmpty) {
        image = img;
      } else if (img is Map && img['url'] is String) {
        image = img['url'] as String;
      }
    }
    final readTime = json['reading_time'] ?? json['read_time_minutes'];
    return FeedItem(
      id: json['id']?.toString() ?? '',
      url: json['url'] as String? ?? '',
      title: json['title'] as String? ?? '',
      summary: json['summary'] as String?,
      contentText: json['content_text'] as String?,
      datePublished: json['date_published'] as String?,
      tags: tags,
      authorName: author,
      imageUrl: image,
      biasIndex: (json['bias_index'] as num?)?.toDouble(),
      readTimeMinutes: readTime is int ? readTime : (readTime as num?)?.toInt(),
    );
  }

  String get categoryLabel => tags.isNotEmpty ? tags.first : 'সর্বশেষ';

  bool get isLiveLike {
    final t = title.toLowerCase();
    return tags.any((tag) {
      final l = tag.toLowerCase();
      return l.contains('লাইভ') || l.contains('live') || l.contains('ব্রেকিং') || l.contains('breaking');
    }) || t.contains('লাইভ') || t.contains('live') || t.contains('ব্রেকিং') || t.contains('সরাসরি');
  }

  bool get isVideoLike {
    final t = title.toLowerCase();
    return tags.any((tag) {
      final l = tag.toLowerCase();
      return l.contains('ভিডিও') || l.contains('video');
    }) || t.contains('ভিডিও') || t.contains('video') || t.contains('দেখুন');
  }

  String get publishedLabel {
    final dt = DateTime.tryParse(datePublished ?? '');
    if (dt == null) return '';
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'এইমাত্র';
    if (diff.inMinutes < 60) return '${diff.inMinutes} মিনিট আগে';
    if (diff.inHours < 24) return '${diff.inHours} ঘণ্টা আগে';
    if (diff.inDays < 7) return '${diff.inDays} দিন আগে';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  bool get hasImage => imageUrl != null && imageUrl!.isNotEmpty;

  String get readTimeLabel {
    final minutes = readTimeMinutes;
    if (minutes == null || minutes <= 0) return '';
    if (minutes < 1) return '১ মিনিট পড়া';
    // Bengali digits for polish.
    const bengali = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    final digits = minutes.toString().split('').map((c) => bengali[int.parse(c)]).join();
    return '$digits মিনিট পড়া';
  }
}

class LiveEntry {
  final String id;
  final String bodyBn;
  final String author;
  final String? imageUrl;
  final DateTime createdAt;

  LiveEntry({
    required this.id,
    required this.bodyBn,
    required this.author,
    this.imageUrl,
    required this.createdAt,
  });

  factory LiveEntry.fromJson(Map<String, dynamic> json) {
    return LiveEntry(
      id: json['id']?.toString() ?? '',
      bodyBn: json['body_bn'] as String? ?? json['body'] as String? ?? '',
      author: json['author'] as String? ?? '',
      imageUrl: json['image_url'] as String?,
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}

class VideoItem {
  final String id;
  final String titleBn;
  final String category;
  final String? thumbnailUrl;
  final String? embedUrl;
  final bool isLive;

  VideoItem({
    required this.id,
    required this.titleBn,
    required this.category,
    this.thumbnailUrl,
    this.embedUrl,
    this.isLive = false,
  });

  factory VideoItem.fromJson(Map<String, dynamic> json) {
    return VideoItem(
      id: json['id']?.toString() ?? '',
      titleBn: json['title_bn'] as String? ?? json['title'] as String? ?? '',
      category: json['category'] as String? ?? '',
      thumbnailUrl: json['thumbnail_url'] as String?,
      embedUrl: json['embed_url'] as String?,
      isLive: json['is_live'] as bool? ?? false,
    );
  }
}