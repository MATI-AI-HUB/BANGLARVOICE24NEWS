class PendingArticle {
  final String id;
  final String slug;
  final String titleBn;
  final String category;
  final String reporterName;
  final DateTime? submittedAt;
  final int aiScore;

  const PendingArticle({
    required this.id,
    required this.slug,
    required this.titleBn,
    required this.category,
    required this.reporterName,
    this.submittedAt,
    this.aiScore = 0,
  });

  factory PendingArticle.fromJson(Map<String, dynamic> j) => PendingArticle(
        id: j['id']?.toString() ?? '',
        slug: j['slug']?.toString() ?? '',
        titleBn: j['title_bn'] as String? ?? '',
        category: j['category'] as String? ?? '',
        reporterName: j['reporter_name'] as String? ?? 'রিপোর্টার',
        submittedAt:
            DateTime.tryParse(j['submitted_at'] as String? ?? ''),
        aiScore: (j['ai_score'] as num?)?.toInt() ?? 0,
      );
}
