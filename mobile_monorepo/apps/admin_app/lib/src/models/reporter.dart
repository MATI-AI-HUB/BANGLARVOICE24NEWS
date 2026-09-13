class Reporter {
  final String id;
  final String name;
  final String email;
  final int reportsCount;
  final DateTime? lastActive;
  final String status;

  const Reporter({
    required this.id,
    required this.name,
    required this.email,
    this.reportsCount = 0,
    this.lastActive,
    this.status = 'active',
  });

  factory Reporter.fromJson(Map<String, dynamic> j) => Reporter(
        id: j['id']?.toString() ?? '',
        name: j['name'] as String? ?? '',
        email: j['email'] as String? ?? '',
        reportsCount: (j['reports_count'] as num?)?.toInt() ?? 0,
        lastActive: DateTime.tryParse(j['last_active'] as String? ?? ''),
        status: j['status'] as String? ?? 'active',
      );

  bool get isActive => status == 'active';
}
