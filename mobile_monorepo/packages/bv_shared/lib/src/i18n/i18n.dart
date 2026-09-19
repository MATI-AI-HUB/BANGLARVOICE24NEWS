/// Banglar Voice — shared locale engine for all Flutter apps.
library;

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'categories.dart';
import 'dict_bn.dart';
import 'dict_en.dart';

enum AppLocale { bn, en }

class LocaleNotifier extends ChangeNotifier {
  AppLocale _current = AppLocale.bn;
  AppLocale get current => _current;

  static const String _prefsKey = 'app_locale';

  Future<void> load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final v = prefs.getString(_prefsKey);
      _current = v == 'en' ? AppLocale.en : AppLocale.bn;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> set(AppLocale loc) async {
    if (_current == loc) return;
    _current = loc;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefsKey, loc.name);
    } catch (_) {}
    notifyListeners();
  }

  Future<void> toggle() =>
      set(_current == AppLocale.bn ? AppLocale.en : AppLocale.bn);

  String t(String key) => translate(key, _current);
  String category(String bnLabel) => translateCategory(_current, bnLabel);
  String categoryKey(String asciiKey) => translateCategoryKey(_current, asciiKey);
}

final LocaleNotifier localeNotifier = LocaleNotifier();

String translate(String key, AppLocale loc) {
  final dict = loc == AppLocale.en ? dictEn : dictBn;
  return dict[key] ?? dictBn[key] ?? key;
}

String translateCategory(AppLocale loc, String bnLabel) {
  final trimmed = bnLabel.trim();
  if (trimmed.isEmpty) return trimmed;
  if (loc == AppLocale.bn) return trimmed;
  return categoryMap[trimmed] ?? trimmed;
}

String translateCategoryKey(AppLocale loc, String asciiKey) {
  final dictKey = categoryKeyToDictKey[asciiKey.trim()];
  if (dictKey == null) return asciiKey;
  return translate(dictKey, loc);
}
