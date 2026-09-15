/// Banglar Voice — Breaking Live Studio (entrypoint).
import 'package:flutter/material.dart';
import 'src/screens/live_setup_screen.dart';
import 'src/services/studio_session.dart';
import 'package:supabase_core/supabase_core.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseCore.initialize();
  runApp(const BanglarVoiceStudioApp());
  SupabaseCore.realtimeChannel(
    name: 'live_sessions',
    table: 'live_sessions',
    onEvent: () {},
  );
}

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
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final s = StudioSessionStore.current;
    if (s == null) return const _LoginScreen();
    if (s.canGoLive) return LiveSetupScreen(session: s);
    return _NoLivePermissionScreen(session: s);
  }
}

/// Real login screen (Supabase email/password).
class _LoginScreen extends StatefulWidget {
  const _LoginScreen();

  @override
  State<_LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<_LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    final email = _email.text.trim();
    final pass = _password.text;
    if (email.isEmpty || pass.isEmpty) {
      setState(() => _error = 'ইমেইল ও পাসওয়ার্ড দিন');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    final err = await StudioSessionStore.login(email, pass);

    if (!mounted) return;
    setState(() => _loading = false);

    if (err != null) {
      setState(() => _error = err);
      return;
    }

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const StudioEntry()),
    );
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                  Text(
                    'স্টুডিওতে প্রবেশ',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Live Permission রোল অনুযায়ী স্বয়ংক্রিয়ভাবে সেট হবে',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white60, fontSize: 12),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'ইমেইল',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    onSubmitted: (_) => _login(),
                    decoration: const InputDecoration(
                      labelText: 'পাসওয়ার্ড',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.lock_outline),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFCC0000),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: _loading ? null : _login,
                    icon: _loading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.login),
                    label: Text(_loading ? 'প্রবেশ করা হচ্ছে…' : 'প্রবেশ করুন'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (_) =>
                            LiveSetupScreen(session: StudioSession.demo()),
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
                Text(
                  'লাইভ অনুমতি নেই',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
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
                      builder: (_) =>
                          LiveSetupScreen(session: StudioSession.demo()),
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
