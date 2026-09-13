import 'package:flutter/material.dart';

import '../models/dashboard_stats.dart';
import '../services/admin_api.dart';
import '../services/admin_session.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = AdminApi();
  DashboardStats _stats = DashboardStats.empty;
  bool _loading = true;
  bool _breaking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final stats = await _api.fetchStats();
    if (!mounted) return;
    setState(() {
      _stats = stats;
      _breaking = stats.breakingActive;
      _loading = false;
    });
  }

  Future<void> _logout() async {
    await AdminSession.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ড্যাশবোর্ড'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Stats grid
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.5,
                    children: [
                      _statCard(
                        'আজ প্রকাশিত',
                        '${_stats.todayPublished}',
                        Icons.check_circle,
                        Colors.green,
                      ),
                      _statCard(
                        'অনুমোদন বাকি',
                        '${_stats.pendingCount}',
                        Icons.pending,
                        Colors.orange,
                      ),
                      _statCard(
                        'সক্রিয় রিপোর্টার',
                        '${_stats.reporterCount}',
                        Icons.people,
                        Colors.blue,
                      ),
                      _statCard(
                        'AI খরচ',
                        '\$${_stats.aiCostUsd.toStringAsFixed(2)}',
                        Icons.attach_money,
                        Colors.purple,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Breaking news toggle
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.bolt, color: Colors.red),
                              const SizedBox(width: 8),
                              const Text(
                                'ব্রেকিং নিউজ',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Spacer(),
                              Switch(
                                value: _breaking,
                                onChanged: (v) async {
                                  await _api.setBreaking(active: v);
                                  if (!mounted) return;
                                  setState(() => _breaking = v);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        v
                                            ? 'ব্রেকিং নিউজ চালু হয়েছে'
                                            : 'ব্রেকিং নিউজ বন্ধ হয়েছে',
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _breaking
                                ? '🟢 টিকার এখন লাইভ'
                                : '⚪ টিকার নিষ্ক্রিয়',
                            style: TextStyle(
                              color: _breaking ? Colors.green : Colors.grey,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // AI tokens
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.memory, color: Colors.deepPurple),
                      title: const Text('AI টোকেন'),
                      subtitle: Text('${_stats.aiTokens} টোকেন ব্যবহৃত'),
                      trailing: Text(
                        '\$${_stats.aiCostUsd.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),

                  // Last publish
                  if (_stats.lastPublish != null)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.schedule),
                        title: const Text('শেষ প্রকাশ'),
                        subtitle: Text(_fmtTime(_stats.lastPublish!)),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 26),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _fmtTime(DateTime t) {
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 1) return 'এইমাত্র';
    if (diff.inMinutes < 60) return '${diff.inMinutes} মিনিট আগে';
    if (diff.inHours < 24) return '${diff.inHours} ঘণ্টা আগে';
    return '${diff.inDays} দিন আগে';
  }
}
