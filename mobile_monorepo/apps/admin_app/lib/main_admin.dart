/// Banglar Voice — Editorial & Admin Command App (entrypoint).
library;

import 'package:flutter/material.dart';
import 'package:supabase_core/supabase_core.dart';

import 'src/screens/login_screen.dart';
import 'src/screens/main_shell.dart';
import 'src/services/admin_session.dart';
import 'src/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AdminSession.load();
  await SupabaseCore.initialize();
  runApp(const BvAdminApp());
}

class BvAdminApp extends StatelessWidget {
  const BvAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'বাংলার ভয়েস — অ্যাডমিন',
      debugShowCheckedModeBanner: false,
      theme: buildAdminTheme(Brightness.light),
      darkTheme: buildAdminTheme(Brightness.dark),
      home: AdminSession.isLogged ? const MainShell() : const LoginScreen(),
    );
  }
}
