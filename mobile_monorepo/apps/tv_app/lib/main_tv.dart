import 'package:flutter/material.dart';
import 'package:supabase_core/supabase_core.dart';

import 'src/config.dart';
import 'src/screens/tv_home.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await TvConfig.load();
  await SupabaseCore.initialize();
  runApp(const BvTvApp());
  SupabaseCore.realtimeChannel(
    name: 'breaking_ticker',
    table: 'breaking_ticker',
    onEvent: () {},
  );
}

class BvTvApp extends StatelessWidget {
  const BvTvApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'বাংলার ভয়েস টিভি',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFFC41E1E),
        useMaterial3: true,
        brightness: Brightness.dark,
      ),
      home: const TvHome(),
    );
  }
}
