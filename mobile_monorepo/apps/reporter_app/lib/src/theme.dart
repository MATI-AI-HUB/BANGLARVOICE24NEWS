/// Banglar Voice Field Reporter — theme (light + dark), Noto-Sans-Bengali
/// friendly text scaling, brand red #CC0000 primary, deep navy dark surface.
library;

import 'package:flutter/material.dart';

const Color kBrandRed = Color(0xFFCC0000);
const Color kDeepNavy = Color(0xFF0A1931);

ThemeData buildReporterTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: kBrandRed,
    brightness: brightness,
    primary: isDark ? const Color(0xFFFF5A5A) : kBrandRed,
    surface: isDark ? kDeepNavy : Colors.white,
  );
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: isDark ? const Color(0xFF0B1220) : const Color(0xFFFAF9F7),
  );
  return base.copyWith(
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? kDeepNavy : Colors.white,
      foregroundColor: isDark ? Colors.white : const Color(0xFF111111),
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w700,
        color: isDark ? Colors.white : const Color(0xFF111111),
        fontFamily: 'NotoSerifBengali',
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kBrandRed,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    cardTheme: CardThemeData(
      color: isDark ? const Color(0xFF14203A) : Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFE8E4DF),
        ),
      ),
    ),
    dividerTheme: DividerThemeData(
      color: isDark ? Colors.white.withValues(alpha: 0.08) : const Color(0xFFECEAE6),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      side: BorderSide(
        color: isDark ? Colors.white.withValues(alpha: 0.15) : const Color(0xFFE2DEDA),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: isDark ? const Color(0xFF24304F) : const Color(0xFF24304F),
      contentTextStyle: const TextStyle(color: Colors.white, fontSize: 14),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      filled: true,
      fillColor: isDark ? Colors.white.withValues(alpha: 0.04) : Colors.white,
    ),
  );
}
