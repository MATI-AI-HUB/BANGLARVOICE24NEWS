import 'package:flutter/material.dart';

import '../models/pending_article.dart';
import '../services/admin_api.dart';

class ApprovalScreen extends StatefulWidget {
  const ApprovalScreen({super.key});

  @override
  State<ApprovalScreen> createState() => _ApprovalScreenState();
}

class _ApprovalScreenState extends State<ApprovalScreen> {
  final _api = AdminApi();
  List<PendingArticle> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await _api.fetchPending();
    if (!mounted) return;
    setState(() {
      _items = items;
      _loading = false;
    });
  }

  Future<void> _approve(PendingArticle a) async {
    final ok = await _api.approve(a.id);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? '✅ অনুমোদিত: ${a.titleBn}' : '❌ ব্যর্থ'),
        backgroundColor: ok ? Colors.green : Colors.red,
      ),
    );
    if (ok) _load();
  }

  Future<void> _reject(PendingArticle a) async {
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) {
        final c = TextEditingController();
        return AlertDialog(
          title: const Text('বাতিলের কারণ'),
          content: TextField(
            controller: c,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'কারণ লিখুন...'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('বাতিল'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () => Navigator.pop(ctx, c.text),
              child: const Text('নিশ্চিত'),
            ),
          ],
        );
      },
    );
    if (reason == null) return;
    final ok = await _api.reject(a.id, reason: reason);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? 'বাতিল হয়েছে' : 'ব্যর্থ')),
    );
    if (ok) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('অনুমোদন কাতার'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle_outline,
                          size: 64, color: Colors.green),
                      SizedBox(height: 12),
                      Text('সব অনুমোদিত — কাতার খালি'),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    itemBuilder: (_, i) => _card(_items[i]),
                  ),
                ),
    );
  }

  Widget _card(PendingArticle a) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _chip(a.category),
                const SizedBox(width: 6),
                _scoreChip(a.aiScore),
                const Spacer(),
                Text(
                  _timeAgo(a.submittedAt),
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              a.titleBn,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              maxLines: 3,
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text(a.reporterName,
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _reject(a),
                    icon: const Icon(Icons.close, color: Colors.red),
                    label: const Text('বাতিল'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    style: FilledButton.styleFrom(backgroundColor: Colors.green),
                    onPressed: () => _approve(a),
                    icon: const Icon(Icons.check),
                    label: const Text('অনুমোদন'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFC41E1E).withValues(alpha: .1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label.isEmpty ? 'অন্যান্য' : label,
          style: const TextStyle(fontSize: 11, color: Color(0xFFC41E1E)),
        ),
      );

  Widget _scoreChip(int score) {
    final color = score >= 80
        ? Colors.green
        : score >= 60
            ? Colors.orange
            : Colors.red;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        'AI $score',
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.bold),
      ),
    );
  }

  String _timeAgo(DateTime? t) {
    if (t == null) return '';
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 1) return 'এইমাত্র';
    if (d.inMinutes < 60) return '${d.inMinutes}মি আগে';
    if (d.inHours < 24) return '${d.inHours}ঘ আগে';
    return '${d.inDays}দ আগে';
  }
}
