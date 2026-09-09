/// Banglar Voice Field Reporter — app root.
/// Loads session + queue, then shows Login or MainShell.
library;

import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'screens/main_shell.dart';
import 'services/offline_queue.dart';
import 'services/reporter_session.dart';
import 'theme.dart';

class BvReporterApp extends StatefulWidget {
  const BvReporterApp({super.key});

  @override
  State<BvReporterApp> createState() => _BvReporterAppState();
}

class _BvReporterAppState extends State<BvReporterApp> {
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    await SessionStore.load();
    await OfflineQueue.instance.init();
    if (mounted) setState(() => _ready = true);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'বাংলার ভয়েস — ফিল্ড রিপোর্টার',
      debugShowCheckedModeBanner: false,
      theme: buildReporterTheme(Brightness.light),
      darkTheme: buildReporterTheme(Brightness.dark),
      home: _ready
          ? (SessionStore.current == null
                ? const LoginScreen()
                : const MainShell())
          : const Scaffold(body: Center(child: CircularProgressIndicator())),
    );
  }
}
