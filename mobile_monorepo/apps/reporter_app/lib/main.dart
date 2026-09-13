/// Banglar Voice Field Reporter — default Android entrypoint.
/// Forwards to main_reporter.dart (Gradle plugin's default target).
library;

import 'main_reporter.dart' as app;

Future<void> main() => app.main();
