/// Login / role gate — Staff Reporter (verified) vs Citizen Reporter.
/// No real auth backend exists (PocketBase has no auth collection wired), so
/// login is a local session: role selection + name/phone. Verified staff are
/// flagged by desk; citizen reporters always need editor approval.
library;

import 'package:flutter/material.dart';

import '../models.dart';
import '../services/reporter_session.dart';
import '../theme.dart';
import 'main_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  ReporterRole _role = ReporterRole.citizen;
  bool _verified = false;
  String? _desk;

  Future<void> _continue() async {
    if (_name.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('আপনার নাম লিখুন')));
      return;
    }
    final session = ReporterSession(
      name: _name.text.trim(),
      phone: _phone.text.trim(),
      role: _role,
      // NOTE: real verification comes from backend (journalists table
      // is_field_reporter=1 + approved). This toggle is the local scaffold.
      verified: _verified,
      desk: _verified ? _desk : null,
    );
    await SessionStore.save(session);
    if (mounted) {
      Navigator.of(
        context,
      ).pushReplacement(MaterialPageRoute(builder: (_) => const MainShell()));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 24),
            const Icon(Icons.campaign, size: 52, color: kBrandRed),
            const SizedBox(height: 12),
            Text(
              'বাংলার ভয়েস',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                fontFamily: 'NotoSerifBengali',
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            Text(
              'ফিল্ড রিপোর্টার',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 28),

            // Role cards
            _RoleCard(
              icon: Icons.badge_outlined,
              title: 'স্টাফ রিপোর্টার',
              subtitle: 'ভেরিফায়েড — সরাসরি পাবলিশ রিকোয়েস্ট',
              selected: _role == ReporterRole.staff,
              onTap: () => setState(() => _role = ReporterRole.staff),
            ),
            const SizedBox(height: 10),
            _RoleCard(
              icon: Icons.groups_outlined,
              title: 'নাগরিক সাংবাদিক',
              subtitle: 'এডিটর অনুমোদন লাগবে',
              selected: _role == ReporterRole.citizen,
              onTap: () => setState(() => _role = ReporterRole.citizen),
            ),

            const SizedBox(height: 24),
            TextField(
              controller: _name,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'আপনার নাম',
                hintText: 'যেমন: রফিকুল ইসলাম',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'মোবাইল নম্বর',
                hintText: '01XXXXXXXXX',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),

            if (_role == ReporterRole.staff) ...[
              const SizedBox(height: 12),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('ভেরিফায়েড স্টাফ'),
                subtitle: const Text('ডেস্ক সহ'),
                value: _verified,
                onChanged: (v) => setState(() => _verified = v),
              ),
              if (_verified) ...[
                const SizedBox(height: 8),
                TextField(
                  onChanged: (v) => _desk = v,
                  decoration: const InputDecoration(
                    labelText: 'ডেস্ক (যেমন: রাজনীতি ডেস্ক)',
                    prefixIcon: Icon(Icons.work_outline),
                  ),
                ),
              ],
            ],

            const SizedBox(height: 24),
            FilledButton(
              onPressed: _continue,
              child: const Text('রিপোর্টিং শুরু করুন'),
            ),
            const SizedBox(height: 12),
            Text(
              'রোল অনুযায়ী: স্টাফ রিপোর্টারের রিপোর্ট দ্রুত পাবলিশ-রিকোয়েস্টে যায়; নাগরিক সাংবাদিকের রিপোর্ট এডিটর রিভিউ পেরিয়ে অনুমোদিত হয়।',
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected
          ? kBrandRed.withValues(alpha: 0.1)
          : scheme.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? kBrandRed : scheme.outlineVariant,
              width: selected ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(icon, color: selected ? kBrandRed : scheme.onSurfaceVariant),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle, color: kBrandRed, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
