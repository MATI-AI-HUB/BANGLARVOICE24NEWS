/// Banglar Voice — shared API client + models for all 4 apps.
/// Points at the PocketBase REST API (public list/article endpoints) or, when
/// BV_API_BASE is absent, degrades to offline/demo state (never hard-fails).
library;

import 'dart:convert';
import 'package:http/http.dart' as http;

class Article {
  final String slug;
  final String titleBn;
  final String dekBn;
  final String bodyBn;
  final String category;
  final List<String> tags;
  final String? image;
  final int? readingTimeMin;
  final bool isBreaking;

  const Article({
    required this.slug,
    required this.titleBn,
    required this.dekBn,
    required this.bodyBn,
    required this.category,
    required this.tags,
    this.image,
    this.readingTimeMin,
    this.isBreaking = false,
  });

  factory Article.fromJson(Map<String, dynamic> j) => Article(
        slug: (j['slug'] ?? '').toString(),
        titleBn: (j['title_bn'] ?? '').toString(),
        dekBn: (j['dek_bn'] ?? '').toString(),
        bodyBn: (j['body_bn'] ?? '').toString(),
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
