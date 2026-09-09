/// Realtime subscription example — field_reports postgres_changes.
///
/// Mirrors supabase/examples/breaking-ticker.ts:46 (BreakingTicker
/// subscription) for the reporter side: whenever a field report row changes
/// (e.g. an editor flips status -> 'approved_for_live' in the Editorial app),
/// this channel delivers the payload instantly so the reporter UI can react
/// without polling.
///
/// MODELED ON (TypeScript original):
///   supabase
///     .channel("breaking_ticker_realtime")
///     .on("postgres_changes",
///       { event: "UPDATE", schema: "public", table: "breaking_ticker" }, cb)
///     .subscribe();
///
/// NOTE: The supabase publication already includes field_reports
/// (supabase/schema.sql — "alter publication supabase_realtime add table
/// public.field_reports") and the table has `replica identity full`, so
/// UPDATE payloads carry the full row.
///
/// This is a scaffold/example service — it is NOT started automatically in
/// main_reporter.dart. Wire it after Supabase Auth sign-in exists:
///   await SupabaseClientHolder.ensureInitialized();
///   RealtimeFieldReports.instance.start(onStatusChanged: ...);
library;

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/supabase_client.dart';

/// Status values from supabase/schema.sql `report_status` enum.
class FieldReportStatus {
  static const draft = 'draft';
  static const pendingReview = 'pending_review';
  static const approvedForLive =
      'approved_for_live'; // editor approved → breaking/live
  static const published = 'published';
  static const rejected = 'rejected';
}

class RealtimeFieldReports {
  RealtimeFieldReports._();
  static final RealtimeFieldReports instance = RealtimeFieldReports._();

  RealtimeChannel? _channel;

  /// Starts listening for field_reports changes on the shared client.
  /// [onStatusChanged] fires with (reportId, newStatus) for UPDATE events.
  /// No-op (returns false) when Supabase is not configured — the app must
  /// keep working without a live project.
  bool start({
    void Function(String reportId, String newStatus)? onStatusChanged,
    void Function(Map<String, dynamic> inserted)? onInserted,
  }) {
    final client = SupabaseClientHolder.client;
    if (client == null) return false;

    _channel ??= client
        .channel('field_reports_reporter')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'field_reports',
          callback: (payload) {
            final row = payload.newRecord;
            final id = (row['id'] ?? '').toString();
            switch (payload.eventType) {
              case PostgresChangeEvent.insert:
                onInserted?.call(row);
                break;
              case PostgresChangeEvent.update:
                final status = (row['status'] ?? '').toString();
                onStatusChanged?.call(id, status);
                break;
              default:
                break;
            }
          },
        );

    _channel!.subscribe((status, error) {
      // status == RealtimeSubscribeStatus.subscribed → connected; any other
      // state is transient (connecting) or an auth/network error — swallow
      // silently so the reporter UI never crashes when the socket drops.
    });
    return true;
  }

  Future<void> stop() async {
    await _channel?.unsubscribe();
    _channel = null;
  }
}
