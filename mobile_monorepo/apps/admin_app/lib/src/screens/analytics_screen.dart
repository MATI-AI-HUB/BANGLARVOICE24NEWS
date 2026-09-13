import 'package:flutter/material.dart';

import '../models/dashboard_stats.dart';
import '../services/admin_api.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  final _api = AdminApi();
  DashboardStats _stats = DashboardStats.empty;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final s = await _api.fetchStats();
    if (!mounted) return;
    setState(() {
      _stats = s;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('বিশ্লেষণ'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _sectionTitle('AI ব্যবহার'),
                Card(
                  child: Column(
                    children: [
                      _row('মোট টোকেন', '${_stats.aiTokens}'),
                      _divider(),
                      _row('খরচ', '\$${_stats.aiCostUsd.toStringAsFixed(2)}'),
                      _divider(),
                      _row(
                        'প্রতি ১K টোকেন',
                        _stats.aiTokens > 0
                            ? '\$${(_stats.aiCostUsd / (_stats.aiTokens / 1000)).toStringAsFixed(4)}'
                            : '\$0',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                _sectionTitle('প্রকাশনা'),
                Card(
                  child: Column(
                    children: [
                      _row('আজ প্রকাশিত', '${_stats.todayPublished}'),
                      _divider(),
                      _row('অনুমোদন বাকি', '${_stats.pendingCount}'),
                      _divider(),
                      _row('সক্রিয় রিপোর্টার', '${_stats.reporterCount}'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  color: Colors.blue.withValues(alpha: .05),
                  child: const Padding(
                    padding: EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'বিস্তারিত বিশ্লেষণ worker-এর ai_audit_log টেবিল থেকে আসবে — backend connected হলে স্বয়ংক্রিয়ভাবে হালনাগাদ হবে।',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(t,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      );

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Expanded(child: Text(label)),
            Text(value,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
      );

  Widget _divider() => const Divider(height: 1, indent: 16, endIndent: 16);
}
