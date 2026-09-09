import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'src/config.dart';
import 'src/theme.dart';
import 'src/screens/categories_screen.dart';
import 'src/screens/home_screen.dart';
import 'src/screens/live_screen.dart';
import 'src/screens/saved_screen.dart';
import 'src/screens/settings_screen.dart';

import 'package:supabase_core/supabase_core.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final savedDark = prefs.getBool('dark_mode');
  final systemDark =
      WidgetsBinding.instance.platformDispatcher.platformBrightness ==
      Brightness.dark;
  await AppSettings.load(); // restore persisted API base override
  // Same shared Supabase project as the other four apps (no-op until dart-defines).
  // (Wraps Supabase.initialize — see packages/supabase_core.)
  await SupabaseCore.initialize();
  runApp(BvApp(initialDark: savedDark ?? systemDark));
  // Realtime: TV/reader ticker refreshes when an editor flips a ticker row.
  SupabaseCore.realtimeChannel(
    name: 'breaking_ticker',
    table: 'breaking_ticker',
    onEvent: () {
      /* breaking_ticker changed → ticker will refresh */
    },
  );
}

class BvApp extends StatefulWidget {
  const BvApp({super.key, required this.initialDark});
  final bool initialDark;

  @override
  State<BvApp> createState() => _BvAppState();
}

class _BvAppState extends State<BvApp> {
  late bool _dark = widget.initialDark;

  Future<void> _setDark(bool value) async {
    setState(() => _dark = value);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('dark_mode', value);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appNameBn,
      debugShowCheckedModeBanner: false,
      theme: BvTheme.light(),
      darkTheme: BvTheme.dark(),
      themeMode: _dark ? ThemeMode.dark : ThemeMode.light,
      home: HomeShell(onDarkChanged: _setDark, isDark: _dark),
    );
  }
}

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.onDarkChanged,
    required this.isDark,
  });
  final ValueChanged<bool> onDarkChanged;
  final bool isDark;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: [
          const HomeScreen(),
          const LiveScreen(),
          const CategoriesScreen(),
          const SavedScreen(),
          SettingsScreen(
            isDark: widget.isDark,
            onDarkChanged: widget.onDarkChanged,
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'হোম',
          ),
          NavigationDestination(
            icon: Icon(Icons.sensors_outlined),
            selectedIcon: Icon(Icons.sensors_rounded),
            label: 'লাইভ',
          ),
          NavigationDestination(
            icon: Icon(Icons.grid_view_outlined),
            selectedIcon: Icon(Icons.grid_view_rounded),
            label: 'ক্যাটাগরি',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_outline_rounded),
            selectedIcon: Icon(Icons.bookmark_rounded),
            label: 'সংরক্ষিত',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'প্রোফাইল',
          ),
        ],
      ),
    );
  }
}
