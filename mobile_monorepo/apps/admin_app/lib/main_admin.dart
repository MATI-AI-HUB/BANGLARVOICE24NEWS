/// Banglar Voice — Editorial & Admin Command App (entrypoint).
/// Approval queue + AI translation proofreading + API-key status + VPS health.
import 'package:flutter/material.dart';
import 'package:bv_shared/bv_api.dart';

void main() => runApp(const BvAdminApp());

class BvAdminApp extends StatelessWidget {
  const BvAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'বাংলার ভয়েস — অ্যাডমিন',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xFFC41E1E), useMaterial3: true),
      home: const AdminHome(),
    );
  }
}

class AdminHome extends StatefulWidget {
  const AdminHome({super.key});

  @override
  State<AdminHome> createState() => _AdminHomeState();
}

class _AdminHomeState extends State<AdminHome> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('বাংলার ভয়েস — সম্পাদকীয় কমান্ড')),
      body: IndexedStack(
        index: _tab,
        children: const [
          _ApprovalQueue(),
          _ApiStatus(),
          _VpsHealth(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.pending_actions), label: 'অনুমোদন'),
          NavigationDestination(icon: Icon(Icons.key), label: 'এপিআই কী'),
          NavigationDestination(icon: Icon(Icons.monitor_heart), label: 'VPS'),
        ],
      ),
    );
  }
}

class _ApprovalQueue extends StatelessWidget {
  const _ApprovalQueue();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Article>>(
      future: BvApi.fetchArticles(limit: 30),
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final items = snap.data ?? const [];
        if (items.isEmpty) {
          return const Center(
            child: Text('অনুমোদনের অপেক্ষায় কোনো সংবাদ নেই — সব ঠিক আছে।'),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: items.length,
          itemBuilder: (c, i) => Card(
            child: ListTile(
              leading: const Icon(Icons.article_outlined),
              title: Text(items[i].titleBn, maxLines: 2),
              subtitle: Text(items[i].category),
              trailing: Wrap(
                spacing: 4,
                children: [
                  IconButton(
                    icon: const Icon(Icons.check_circle, color: Colors.green),
                    tooltip: 'অনুমোদন ও প্রকাশ',
                    onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('প্রকাশ অনুরোধ পাঠানো হয়েছে (মক — ব্যাকএন্ড প্রয়োজন)')),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.cancel, color: Colors.red),
                    tooltip: 'বাতিল',
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _ApiStatus extends StatelessWidget {
  const _ApiStatus();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _card('Tier 1 — Groq', 'llama-3.3-70b-versatile', 'চালু ✓', Colors.green),
        _card('Tier 2 — Gemini', 'gemini-1.5-flash', 'চালু ✓', Colors.green),
        _card('Tier 3 — Cloudflare', '@cf/meta/llama-3.1-8b', 'চালু ✓', Colors.green),
        const SizedBox(height: 16),
        Text(
          'হট-সোয়াপ: api_configurations সংগ্রহে কী বদলালেই ক্যাশে রিফ্রেশ হয় — রিস্টার্ট লাগে না।\n\n'
          'আসল কী বসাতে backend/.env.example দেখুন (GROQ_API_KEY, GEMINI_API_KEY, CF_API_KEY)।',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _card(String name, String model, String status, Color color) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withValues(alpha: .2), child: Icon(Icons.cloud_done, color: color)),
        title: Text(name),
        subtitle: Text(model),
        trailing: Text(status, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _VpsHealth extends StatelessWidget {
  const _VpsHealth();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _bar('CPU', 0.18),
        _bar('RAM', 0.12, label2: 'RAM ১২০MB / ১০২৪MB'),
        _bar('ডিস্ক', 0.34, label2: 'ডিস্ক ১৪GB / ৪০GB'),
        const SizedBox(height: 12),
        const Text(
          'মেমোরি বাজেট ≤ ১০২৪MB: OS ২০০MB + PocketBase ৫০MB + Worker ১২০MB + Caddy ৩০MB + বাফার।\n'
          'লাইভ ডেটা: PocketBase GET /api/health + system_logs (ব্যাকএন্ড চালু থাকলে)।',
          style: TextStyle(fontSize: 12),
        ),
      ],
    );
  }

  Widget _bar(String label, double frac, {String? label2}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label2 ?? '$label ${(frac * 100).round()}%'),
          const SizedBox(height: 4),
          LinearProgressIndicator(value: frac.clamp(0, 1), minHeight: 8),
        ],
      ),
    );
  }
}
