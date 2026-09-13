class DashboardStats {
  final int todayPublished;
  final int pendingCount;
  final int reporterCount;
  final double aiCostUsd;
  final int aiTokens;
  final bool breakingActive;
  final DateTime? lastPublish;

  const DashboardStats({
    required this.todayPublished,
    required this.pendingCount,
    required this.reporterCount,
    required this.aiCostUsd,
    required this.aiTokens,
    required this.breakingActive,
    this.lastPublish,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> j) => DashboardStats(
        todayPublished: (j['today_published'] as num?)?.toInt() ?? 0,
        pendingCount: (j['pending_count'] as num?)?.toInt() ?? 0,
        reporterCount: (j['reporter_count'] as num?)?.toInt() ?? 0,
        aiCostUsd: (j['ai_cost_usd'] as num?)?.toDouble() ?? 0.0,
        aiTokens: (j['ai_tokens'] as num?)?.toInt() ?? 0,
        breakingActive: j['breaking_active'] == true,
        lastPublish: DateTime.tryParse(j['last_publish'] as String? ?? ''),
      );

  static const empty = DashboardStats(
    todayPublished: 0,
    pendingCount: 0,
    reporterCount: 0,
    aiCostUsd: 0,
    aiTokens: 0,
    breakingActive: false,
  );
}
