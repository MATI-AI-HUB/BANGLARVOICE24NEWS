import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config.dart';
import '../services/api_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    super.key,
    required this.isDark,
    required this.onDarkChanged,
  });
  final bool isDark;
  final ValueChanged<bool> onDarkChanged;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const String _version = '1.1.0';
  static const String _build = '2';

  bool _testing = false;
  String? _testResult;
  bool _testOk = false;

  Future<void> _editServerUrl() async {
    final controller = TextEditingController(text: AppConfig.currentBase);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('সার্ভার / API ঠিকানা'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'সংবাদ সার্ভারের ঠিকানা (URL)। ডিফল্ট প্রোডাকশন সাইট কাজ না করলে '
              'এখানে নিজের সার্ভারের ঠিকানা দিন — যেমন http://192.168.0.10:8090',
              style: TextStyle(fontSize: 12.5, height: 1.5),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'API Base URL',
                hintText: 'https://banglarvoice24news.com',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link_rounded),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('বাতিল'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('সংরক্ষণ করুন'),
          ),
        ],
      ),
    );
    if (result == null) return;
    if (result.isEmpty) {
      _showSnack('ঠিকানা খালি রাখা যাবে না');
      return;
    }
    final ok = await AppSettings.setApiBase(result);
    if (!ok) {
      _showSnack('ঠিকানাটি বৈধ নয় — http:// বা https:// সহ লিখুন');
      return;
    }
    _showSnack('সার্ভার ঠিকানা সংরক্ষিত হয়েছে');
    setState(() {});
  }

  Future<void> _resetServerUrl() async {
    await AppSettings.resetApiBase();
    setState(() {});
    _showSnack('ডিফল্ট সার্ভারে ফিরে গেছে');
  }

  Future<void> _testServer() async {
    setState(() {
      _testing = true;
      _testResult = null;
    });
    try {
      final api = ApiService(); // reads AppConfig.currentBase
      final msg = await api.ping();
      if (!mounted) return;
      setState(() {
        _testing = false;
        _testResult = msg;
        _testOk = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _testing = false;
        _testResult = '$e';
        _testOk = false;
      });
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(content: Text(msg), duration: const Duration(seconds: 2)),
      );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isOverride = AppSettings.isOverridden;
    return Scaffold(
      appBar: AppBar(title: const Text('সেটিংস')),
      body: ListView(
        children: [
          const SizedBox(height: 8),
          SwitchListTile(
            secondary: Icon(
              widget.isDark
                  ? Icons.dark_mode_rounded
                  : Icons.light_mode_rounded,
              color: scheme.primary,
            ),
            title: const Text('ডার্ক মোড'),
            subtitle: const Text('চোখের জন্য আরামদায়ক রাতের থিম'),
            value: widget.isDark,
            onChanged: widget.onDarkChanged,
          ),
          const Divider(height: 1),
          ListTile(
            leading: Icon(Icons.language_rounded, color: scheme.primary),
            title: const Text('ভাষা'),
            subtitle: const Text('বাংলা (বাংলাদেশ)'),
            trailing: const Icon(Icons.check_rounded),
          ),
          const Divider(height: 1),

          // ---- সার্ভার / API সেকশন ----
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
            child: Row(
              children: [
                Icon(Icons.dns_rounded, size: 18, color: scheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'সার্ভার / API',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.4,
                  ),
                ),
                if (isOverride) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: scheme.tertiaryContainer,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'কাস্টম',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: scheme.onTertiaryContainer,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          ListTile(
            leading: Icon(Icons.link_rounded, color: scheme.primary),
            title: const Text('বর্তমান ঠিকানা'),
            subtitle: Text(
              AppConfig.currentBase,
              style: TextStyle(
                fontSize: 12,
                fontFamily: 'monospace',
                color: isOverride ? scheme.primary : scheme.outline,
              ),
            ),
            trailing: const Icon(Icons.edit_rounded, size: 18),
            onTap: _editServerUrl,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                OutlinedButton.icon(
                  onPressed: _testServer,
                  icon: _testing
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.network_check_rounded, size: 16),
                  label: Text(
                    _testing ? 'পরীক্ষা চলছে…' : 'সংযোগ পরীক্ষা করুন',
                  ),
                ),
                if (isOverride)
                  TextButton.icon(
                    onPressed: _resetServerUrl,
                    icon: const Icon(Icons.restart_alt_rounded, size: 16),
                    label: const Text('ডিফল্টে ফিরুন'),
                  ),
              ],
            ),
          ),
          if (_testResult != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: _testOk
                      ? scheme.primaryContainer.withValues(alpha: 0.5)
                      : scheme.errorContainer.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _testOk
                          ? Icons.check_circle_rounded
                          : Icons.error_rounded,
                      size: 18,
                      color: _testOk ? scheme.primary : scheme.error,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _testResult!,
                        style: TextStyle(
                          fontSize: 12.5,
                          height: 1.4,
                          color: _testOk ? scheme.primary : scheme.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const Divider(height: 24),

          ListTile(
            leading: Icon(Icons.info_outline_rounded, color: scheme.primary),
            title: const Text('অ্যাপের তথ্য'),
            subtitle: Text(
              '${AppConfig.appNameBn} · সংস্করণ $_version ($_build)',
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: Icon(Icons.link_rounded, color: scheme.primary),
            title: const Text('ওয়েবসাইট'),
            subtitle: const Text(AppConfig.defaultApiBase),
            trailing: const Icon(Icons.open_in_new_rounded, size: 16),
            onTap: () async {
              final url = Uri.parse(AppConfig.defaultApiBase);
              await launchUrl(url, mode: LaunchMode.externalApplication);
            },
          ),
          const Divider(height: 1),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 20, 16, 8),
            child: Text(
              'বাংলার ভয়েস — সত্য প্রকাশে নির্ভীক। স্বাধীন ও নিরপেক্ষ সংবাদ পরিবেশনে প্রতিশ্রুতিবদ্ধ।',
              style: TextStyle(fontSize: 13, height: 1.6),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              '© 2026 বাংলার ভয়েস। সর্বস্বত্ব সংরক্ষিত।',
              style: TextStyle(fontSize: 12, color: scheme.outline),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
