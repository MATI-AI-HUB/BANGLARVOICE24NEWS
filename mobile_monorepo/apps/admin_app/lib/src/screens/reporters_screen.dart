import 'package:flutter/material.dart';

import '../models/reporter.dart';
import '../services/admin_api.dart';

class ReportersScreen extends StatefulWidget {
  const ReportersScreen({super.key});

  @override
  State<ReportersScreen> createState() => _ReportersScreenState();
}

class _ReportersScreenState extends State<ReportersScreen> {
  final _api = AdminApi();
  List<Reporter> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await _api.fetchReporters();
    if (!mounted) return;
    setState(() {
      _items = items;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('রিপোর্টার'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('কোনো রিপোর্টার নেই'))
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

  Widget _card(Reporter r) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: r.isActive ? Colors.green : Colors.grey,
          child: Text(
            r.name.isNotEmpty ? r.name[0] : '?',
            style: const TextStyle(color: Colors.white),
          ),
        ),
        title: Text(r.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(r.email, style: const TextStyle(fontSize: 12)),
            Text(
              '${r.reportsCount}টি রিপোর্ট · ${_timeAgo(r.lastActive)}',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: r.isActive
                ? Colors.green.withValues(alpha: .15)
                : Colors.grey.withValues(alpha: .15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            r.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
            style: TextStyle(
              fontSize: 11,
              color: r.isActive ? Colors.green : Colors.grey,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }

  String _timeAgo(DateTime? t) {
    if (t == null) return 'unknown';
    final d = DateTime.now().difference(t);
    if (d.inMinutes < 60) return '${d.inMinutes} মিনিট আগে';
    if (d.inHours < 24) return '${d.inHours} ঘণ্টা আগে';
    return '${d.inDays} দিন আগে';
  }
}
