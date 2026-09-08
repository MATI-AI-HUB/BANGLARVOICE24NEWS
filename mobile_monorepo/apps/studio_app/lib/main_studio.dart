/// Banglar Voice — Breaking Live Studio (entrypoint).
///
/// Control room that can go live in ~10 seconds to the Website player, App
/// push alert, Facebook Page and YouTube simultaneously. This build ships the
/// full director UI (setup → branding overlay → go-live destinations → live
/// controls) with honest config points for LiveKit / RTMP / Mux / Cloudflare /
/// AI — no real stream starts until those services + API-Vault keys exist.
import 'package:flutter/material.dart';

import 'src/screens/live_setup_screen.dart';
import 'src/services/studio_session.dart';

void main() => runApp(const BanglarVoiceStudioApp());

class BanglarVoiceStudioApp extends StatelessWidget {
  const BanglarVoiceStudioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'বাংলার ভয়েস ব্রেকিং লাইভ স্টুডিও',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFFCC0000),
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A1931),
      ),
      home: const StudioEntry(),
    );
  }
}

class StudioEntry extends StatefulWidget {
  const StudioEntry({super.key});

  @override
  State<StudioEntry> createState() => _StudioEntryState();
}

class _StudioEntryState extends State<StudioEntry> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await StudioSessionStore.load();
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    final s = StudioSessionStore.current;
    if (s == null) return const _GateScreen();
    if (s.canGoLive) return LiveSetupScreen(session: s);
    return _NoLivePermissionScreen(session: s);
  }
}

/// Dev/login gate — role picker. In production the role + Live Permission come
/// from the Editorial App backend session; this local gate is the documented
/// stand-in so the flow can be exercised end to end.
class _GateScreen extends StatefulWidget {
  const _GateScreen();

  @override
  State<_GateScreen> createState() => _GateScreenState();
}

class _GateScreenState extends State<_GateScreen> {
  final _name = TextEditingController(text: '');
  StudioRole _role = StudioRole.director;
  bool _live = true;

  Future<void> _enter() async {
    await StudioSessionStore.save(
      name: _name.text.trim().isEmpty ? 'অপারেটর' : _name.text.trim(),
      phone: 'dev',
      role: _role,
      livePermission: _live,
      desk: _role == StudioRole.director ? 'লাইভ ডেস্ক' : null,
    );
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const StudioEntry()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _BrandMark(),
                  const SizedBox(height: 24),
                  Text('স্টুডিওতে প্রবেশ', textAlign: TextAlign.center, style: t.textTheme.headlineSmall),
                  const SizedBox(height: 4),
                  Text(
                    'লগইন গেট — প্রোডাকশনে Live Permission আসবে এডিটোরিয়াল অ্যাপ থেকে',
                    textAlign: TextAlign.center,
                    style: t.textTheme.bodySmall?.copyWith(color: Colors.white60),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _name,
                    decoration: const InputDecoration(
                      labelText: 'অপারেটরের নাম',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<StudioRole>(
                    initialValue: _role,
                    decoration: const InputDecoration(
                      labelText: 'ভূমিকা (Role)',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                    items: StudioRole.values
                        .map((r) => DropdownMenuItem(value: r, child: Text(r.label)))
                        .toList(),
                    onChanged: (v) => setState(() {
                      if (v == null) return;
                      _role = v;
                      _live = v.defaultLivePermission;
                    }),
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('লাইভ অনুমতি (Live Permission)'),
                    subtitle: const Text('থাকলেই Go Live বাটন দেখা যাবে'),
                    value: _live,
                    onChanged: (v) => setState(() => _live = v),
                  ),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFCC0000),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: _enter,
                    icon: const Icon(Icons.login),
                    label: const Text('প্রবেশ করুন', style: TextStyle(fontSize: 16)),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (_) => LiveSetupScreen(session: StudioSession.demo()),
                      ),
                    ),
                    icon: const Icon(Icons.preview_outlined),
                    label: const Text('ডেমো প্রিভিউ (বিকল্প)'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Role without Live Permission: Go Live stays hidden, honest lock screen.
class _NoLivePermissionScreen extends StatelessWidget {
  final StudioSession session;
  const _NoLivePermissionScreen({required this.session});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_outline, size: 64, color: Colors.white38),
                const SizedBox(height: 16),
                Text('লাইভ অনুমতি নেই', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(
                  '${session.name} (${session.role.label}) — Go Live কেবলমাত্র '
                  '"Live Permission" প্রাপ্ত ভূমিকার জন্য। এডিটোরিয়াল অ্যাপ থেকে অনুমতি দিন।',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white60),
                ),
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => LiveSetupScreen(session: StudioSession.demo()),
                    ),
                  ),
                  icon: const Icon(Icons.preview_outlined),
                  label: const Text('ডেমো প্রিভিউ দিয়ে দেখুন'),
                ),
                TextButton(
                  onPressed: () async {
                    await StudioSessionStore.clear();
                    if (context.mounted) {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (_) => const StudioEntry()),
                      );
                    }
                  },
                  child: const Text('লগআউট'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Shared brand mark used on gate screens.
class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            color: const Color(0xFFCC0000),
            borderRadius: BorderRadius.circular(24),
          ),
          child: const Icon(Icons.sensors, color: Colors.white, size: 48),
        ),
        const SizedBox(height: 12),
        const Text(
          'বাংলার ভয়েস',
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w800,
            fontFamily: 'Noto Serif Bengali',
          ),
        ),
        const Text(
          'BREAKING LIVE STUDIO',
          style: TextStyle(
            letterSpacing: 3,
            fontSize: 11,
            color: Colors.white54,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
