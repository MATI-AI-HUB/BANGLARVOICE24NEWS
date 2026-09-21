import 'package:flutter/material.dart';
import 'package:bv_shared/bv_shared.dart';
import 'package:supabase_core/supabase_core.dart';

import 'src/config.dart';
import 'src/screens/tv_home.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await TvConfig.load();
  await localeNotifier.load(); // ← load persisted locale (bn | en)
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
    // Rebuilds the whole app when locale changes (localeNotifier.notifyListeners).
    return ListenableBuilder(
      listenable: localeNotifier,
      builder: (context, _) {
        final localeCode = localeNotifier.current.name; // 'bn' | 'en'
        return MaterialApp(
          title: localeNotifier.t('nav_live'),
          debugShowCheckedModeBanner: false,
          locale: Locale(localeCode),
          supportedLocales: const [Locale('bn'), Locale('en')],
          theme: ThemeData(
            colorSchemeSeed: const Color(0xFFC41E1E),
            useMaterial3: true,
            brightness: Brightness.dark,
          ),
          home: TvHome(),
        );
      },
    );
  }
}
