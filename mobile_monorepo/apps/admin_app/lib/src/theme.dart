import 'package:flutter/material.dart';

ThemeData buildAdminTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  return ThemeData(
    colorSchemeSeed: const Color(0xFFC41E1E),
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: isDark ? const Color(0xFF0F0F0F) : null,
    appBarTheme: AppBarTheme(
      elevation: 0,
      backgroundColor: const Color(0xFFC41E1E),
      foregroundColor: Colors.white,
      centerTitle: false,
    ),
    cardTheme: CardThemeData(
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
      ),
      filled: true,
    ),
  );
}
