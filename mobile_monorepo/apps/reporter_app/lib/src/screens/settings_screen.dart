/// Settings — session (name/phone/role), verification state, connectivity,
/// offline queue size, app version, theme (follows system by default),
/// and log out.
library;

import 'package:flutter/material.dart';

import '../models.dart';
import '../services/offline_queue.dart';
import '../services/reporter_session.dart';
import '../theme.dart';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final session = SessionStore.current;
    final queue = OfflineQueue.instance;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(title: const Text('সেটিংস')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile card
          if (session != null)
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: kBrandRed.withValues(alpha: 0.12),
                      child: Icon(Icons.person, color: kBrandRed, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.name,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            session.phone.isEmpty
                                ? session.role.label
                                : '${session.phone} · ${session.role.label}',
                            style: TextStyle(
                              fontSize: 13,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: (session.role.isStaff
                                      ? const Color(0xFF1D4ED8)
                                      : const Color(0xFFB45309))
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  session.role.isStaff
                                      ? Icons.verified
                                      : Icons.hourglass_top,
                                  size: 13,
                                  color: session.role.isStaff
                                      ? const Color(0xFF1D4ED8)
                                      : const Color(0xFFB45309),
                                ),
                                const SizedBox(width: 4),
                                Flexible(
                                  child: Text(
                                    session.role.isStaff
                                        ? (session.desk != null
                                            ? 'ভেরিফাইড স্টাফ · ${session.desk}'
                                            : 'ভেরিফাইড স্টাফ')
                                        : 'নাগরিক সাংবাদিক — এডিটর অ্যাপ্রুভাল',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: session.role.isStaff
                                          ? const Color(0xFF1D4ED8)
                                          : const Color(0xFFB45309),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 14),

          // Status section
          Card(
            margin: EdgeInsets.zero,
            child: Column(
              children: [
                ListTile(
                  leading: Icon(
                    queue.isOnline ? Icons.cloud_done : Icons.cloud_off,
                    color: queue.isOnline
                        ? const Color(0xFF0E7490)
                        : const Color(0xFFB45309),
                  ),
                  title: Text(queue.isOnline ? 'অনলাইন' : 'অফলাইন'),
                  subtitle: Text(
                    queue.isOnline
                        ? 'রিপোর্ট পাঠানোর জন্য সার্ভার রিচেবল'
                        : 'রিপোর্ট লোকালি সেভ থাকবে, নেট ফিরলে অটো সিঙ্ক',
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.inbox_outlined),
                  title: const Text('কিউতে রিপোর্ট'),
                  subtitle: Text('${queue.reports.length}টি রিপোর্ট সংরক্ষিত'),
                  trailing: Text(
                    '${queue.reports.where((r) => r.status == ReportStatus.sent).length} পাঠানো',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Appearance + info
          Card(
            margin: EdgeInsets.zero,
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_outlined),
                  title: const Text('ডার্ক মোড'),
                  subtitle: const Text('সিস্টেম থিম অনুসরণ করে'),
                  value: isDark,
                  onChanged: (_) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'থিম সিস্টেম সেটিং থেকে আসে — ডিভাইস থিম পরিবর্তন করুন',
                        ),
                      ),
                    );
                  },
                ),
                const Divider(height: 1),
                const ListTile(
                  leading: Icon(Icons.info_outline),
                  title: Text('বাংলার ভয়েস — ফিল্ড রিপোর্টার'),
                  subtitle: Text(
                    'অ্যাপ v1.0.0 · অফলাইন-ফার্স্ট · PocketBase REST\n'
                    'BV_API_BASE=https://banglarvoice24news.com',
                  ),
                  isThreeLine: true,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Logout
          OutlinedButton.icon(
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('লগ আউট করবেন?'),
                  content: const Text('আপনার সেভ করা রিপোর্ট ডিভাইসে থাকবে।'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(false),
                      child: const Text('বাতিল'),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.of(ctx).pop(true),
                      child: const Text('লগ আউট'),
                    ),
                  ],
                ),
              );
              if (ok == true) {
                await SessionStore.clear();
                if (mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                }
              }
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: kBrandRed,
              side: const BorderSide(color: kBrandRed),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.logout),
            label: const Text('লগ আউট'),
          ),
          const SizedBox(height: 10),
          const Center(
            child: Text(
              '© ২০২৬ বাংলার ভয়েস — সাংবাদিকতার স্বার্থে',
              style: TextStyle(fontSize: 11, color: Colors.black38),
            ),
          ),
        ],
      ),
    );
  }
}
