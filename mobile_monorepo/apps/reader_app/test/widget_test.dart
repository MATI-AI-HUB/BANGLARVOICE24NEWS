import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:banglar_voice/main.dart';

void main() {
  testWidgets('App boots and shows bottom navigation', (tester) async {
    SharedPreferences.setMockInitialValues({'dark_mode': false});
    await tester.pumpWidget(const BvApp(initialDark: false));
    await tester.pump();
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('বাংলার ভয়েস'), findsWidgets);
  });
}
