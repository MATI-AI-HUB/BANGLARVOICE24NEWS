import 'package:flutter/material.dart';

/// Banglar Voice design tokens — deep-red brand on warm paper, premium
/// typography. Bengali glyphs render through the platform's Noto Sans Bengali
/// fallback automatically (no bundled-font download needed in release).
class BvColors {
  BvColors._();
  static const Color primary = Color(0xFFC41E1E); // banglar voice red
  static const Color ink = Color(0xFF111111);
  static const Color paper = Color(0xFFFFFDF7);
  static const Color muted = Color(0xFFF2EEE6);
  static const Color line = Color(0xFFE4DFD5);
}

class BvTheme {
  BvTheme._();

  static ThemeData light() => _base(Brightness.light).copyWith(
        scaffoldBackgroundColor: BvColors.paper,
        colorScheme: const ColorScheme.light(
          primary: BvColors.primary,
          secondary: BvColors.ink,
          surface: Colors.white,
          onPrimary: Colors.white,
          onSurface: BvColors.ink,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: BvColors.ink,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: BvColors.ink,
            fontSize: 21,
            fontWeight: FontWeight.w800,
          ),
        ),
        dividerTheme: const DividerThemeData(color: BvColors.line),
      );

  static ThemeData dark() => _base(Brightness.dark).copyWith(
        scaffoldBackgroundColor: const Color(0xFF141414),
        colorScheme: const ColorScheme.dark(
          primary: BvColors.primary,
          secondary: Color(0xFFE8E2D8),
          surface: Color(0xFF1D1C1A),
          onPrimary: Colors.white,
          onSurface: Color(0xFFF2EEE6),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1D1C1A),
          foregroundColor: Color(0xFFF2EEE6),
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            color: Color(0xFFF2EEE6),
            fontSize: 21,
            fontWeight: FontWeight.w800,
          ),
        ),
        dividerTheme: const DividerThemeData(color: Color(0xFF33302C)),
      );

  static ThemeData _base(Brightness b) {
    final isDark = b == Brightness.dark;
    return ThemeData(
      brightness: b,
      useMaterial3: true,
      textTheme: TextTheme(
        headlineLarge: TextStyle(
          fontSize: 30,
          height: 1.25,
          fontWeight: FontWeight.w800,
          color: isDark ? const Color(0xFFF2EEE6) : BvColors.ink,
        ),
        headlineMedium: TextStyle(
          fontSize: 23,
          height: 1.3,
          fontWeight: FontWeight.w800,
          color: isDark ? const Color(0xFFF2EEE6) : BvColors.ink,
        ),
        titleLarge: TextStyle(
          fontSize: 17.5,
          height: 1.35,
          fontWeight: FontWeight.w700,
          color: isDark ? const Color(0xFFF2EEE6) : BvColors.ink,
        ),
        bodyLarge: TextStyle(
          fontSize: 16.5,
          height: 1.85,
          fontWeight: FontWeight.w400,
          color: isDark ? const Color(0xFFDDD8CE) : const Color(0xFF232323),
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          height: 1.6,
          color: isDark ? const Color(0xFFC6C1B6) : Color(0xFF3A3A3A),
        ),
        labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
      cardTheme: CardThemeData(
        color: isDark ? const Color(0xFF1D1C1A) : Colors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
          side: BorderSide(color: isDark ? const Color(0xFF33302C) : BvColors.line),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: isDark ? const Color(0xFF1D1C1A) : Colors.white,
        indicatorColor: BvColors.primary.withValues(alpha: 0.14),
        labelTextStyle: WidgetStatePropertyAll(TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: isDark ? const Color(0xFFF2EEE6) : BvColors.ink,
        )),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: BvColors.primary,
        linearTrackColor: isDark ? const Color(0xFF33302C) : BvColors.line,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? Colors.white : null,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? BvColors.primary : null,
        ),
      ),
    );
  }
}
