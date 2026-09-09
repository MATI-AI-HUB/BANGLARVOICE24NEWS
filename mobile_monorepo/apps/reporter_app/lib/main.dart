/// Banglar Voice Field Reporter — default Android entrypoint.
/// Delegates to main_reporter.dart so `flutter build apk` picks it up without
/// a --target flag (lib/main.dart is the Gradle plugin's default target).
library;

import 'main_reporter.dart' as app;

void main() => app.main();
