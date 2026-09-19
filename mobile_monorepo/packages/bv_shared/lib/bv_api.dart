/// Banglar Voice — shared API client + models for all 4 apps.
/// Points at the PocketBase REST API (public list/article endpoints) or, when
/// BV_API_BASE is absent, degrades to offline/demo state (never hard-fails).
library;

import 'dart:convert';
import 'package:http/http.dart' as http;

import 'src/i18n/i18n.dart';

class Article {
  final String slug;
  final String titleBn;
  final String? titleEn;
  final String dekBn;
  final String? dekEn;
  final String bodyBn;
  final String? bodyEn;
  final String category;
  final List<String> tags;
  final String? image;
  final int? readingTimeMin;
  final bool isBreaking;

  const Article({
    required this.slug,
    required this.titleBn,
    this.titleEn,
    required this.dekBn,
    this.dekEn,
    required this.bodyBn,
    this.bodyEn,
    required this.category,
    required this.tags,
    this.image,
    this.readingTimeMin,
    this.isBreaking = false,
  });

  factory Article.fromJson(Map<String, dynamic> j) => Article(
        slug: (j['slug'] ?? '').toString(),
        titleBn: (j['title_bn'] ?? '').toString(),
        titleEn: j['title_en']?.toString(),
        dekBn: (j['dek_bn'] ?? '').toString(),
        dekEn: j['dek_en']?.toString(),
        bodyBn: (j['body_bn'] ?? '').toString(),
        bodyEn: j['body_en']?.toString(),
        category: (j['category'] ?? '').toString(),
        tags: (j['tags'] is List)
            ? (j['tags'] as List).map((e) => e.toString()).toList()
            : const [],
        image: j['featured_image']?.toString(),
        readingTimeMin: j['reading_time_min'] is int
            ? (j['reading_time_min'] as int)
            : (j['reading_time_min'] is num
                ? (j['reading_time_min'] as num).toInt()
                : null),
        isBreaking: j['is_breaking'] == true,
      );

  /// Returns the title in the requested locale, falling back to Bengali.
  String titleFor(AppLocale loc) {
    if (loc == AppLocale.en && titleEn != null && titleEn!.isNotEmpty) {
      return titleEn!;
    }
    return titleBn;
  }

  /// Returns the dek in the requested locale, falling back to Bengali.
  String dekFor(AppLocale loc) {
    if (loc == AppLocale.en && dekEn != null && dekEn!.isNotEmpty) {
      return dekEn!;
    }
    return dekBn;
  }

  /// Returns the body in the requested locale, falling back to Bengali.
  String bodyFor(AppLocale loc) {
    if (loc == AppLocale.en && bodyEn != null && bodyEn!.isNotEmpty) {
      return bodyEn!;
    }
    return bodyBn;
  }
}

class BvApi {
  BvApi._();
  static const String base =
      String.fromEnvironment('BV_API_BASE', defaultValue: 'https://banglarvoice24news.com');
  static const String articlesPath = '/api/public/articles';
  static const String articlePath = '/api/public/article';

  static Future<List<Article>> fetchArticles({int limit = 20}) async {
    try {
      final res = await http
          .get(Uri.parse('$base$articlesPath?limit=$limit'))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return [];
      final j = jsonDecode(res.body) as Map<String, dynamic>;
      final items = (j['items'] as List? ?? []);
      return items
          .map((e) => Article.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return []; // offline / demo — caller shows empty state gracefully
    }
  }

  static Future<Article?> fetchArticle(String slug) async {
    try {
      final res = await http
          .get(Uri.parse('$base$articlePath/$slug'))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode != 200) return null;
      return Article.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }
}
