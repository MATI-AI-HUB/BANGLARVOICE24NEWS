import 'package:flutter/material.dart';

import '../config.dart';
import '../services/admin_session.dart';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _baseCtl = TextEditingController(text: AdminConfig.currentBase);

  Future<void> _saveBase() async {
    final normalized = AdminConfig.normalizeBase(_baseCtl.text);
    if (normalized == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('অবৈধ URL')),
      );
      return;
    }
    setState(() => AdminConfig.currentBase = normalized);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Backend: $normalized')),
    );
  }

  Future<void> _logout() async {
    await AdminSession.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  void dispose() {
    _baseCtl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('সেটিংস')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('ব্যাকএন্ড',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          TextField(
            controller: _baseCtl,
            decoration: InputDecoration(
              labelText: 'Backend URL',
              suffixIcon: IconButton(
                icon: const Icon(Icons.save),
                onPressed: _saveBase,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'বর্তমান: ${AdminConfig.currentBase}',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 24),
          const Text('সেশন',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('লগআউট'),
              subtitle: const Text('সেশন শেষ করুন'),
              onTap: _logout,
            ),
          ),
          const SizedBox(height: 24),
          const Text('তথ্য',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Card(
            child: Column(
              children: [
                ListTile(
                  leading: Icon(Icons.apps),
                  title: Text('বাংলার ভয়েস অ্যাডমিন'),
                  subtitle: Text('Version 1.0.0'),
                ),
                Divider(height: 1),
                ListTile(
                  leading: Icon(Icons.cloud),
                  title: Text('Endpoint'),
                  subtitle: Text('/api/admin/*'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
