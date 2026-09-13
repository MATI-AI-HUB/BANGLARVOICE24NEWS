/// Live streaming session state.
class LiveSession {
  final String id;
  final String channel; // Agora channel name
  final String title;
  final String reporterName;
  final DateTime startedAt;
  final DateTime? endedAt;
  final String status; // 'starting' | 'live' | 'ended'
  final int viewerCount;

  const LiveSession({
    required this.id,
    required this.channel,
    required this.title,
    required this.reporterName,
    required this.startedAt,
    this.endedAt,
    this.status = 'starting',
    this.viewerCount = 0,
  });

  factory LiveSession.fromJson(Map<String, dynamic> json) {
    return LiveSession(
      id: json['id']?.toString() ?? '',
      channel: json['agora_channel'] as String? ?? '',
      title: json['title'] as String? ?? '',
      reporterName: json['reporter_name'] as String? ?? '',
      startedAt: DateTime.tryParse(json['started_at'] as String? ?? '') ??
          DateTime.now(),
      endedAt: json['ended_at'] != null
          ? DateTime.tryParse(json['ended_at'] as String)
          : null,
      status: json['status'] as String? ?? 'starting',
      viewerCount: (json['viewer_count'] as num?)?.toInt() ?? 0,
    );
  }

  bool get isLive => status == 'live';
  bool get isEnded => status == 'ended';

  Duration get duration {
    final end = endedAt ?? DateTime.now();
    return end.difference(startedAt);
  }

  String get durationLabel {
    final d = duration;
    final h = d.inHours;
    final m = d.inMinutes % 60;
    final s = d.inSeconds % 60;
    if (h > 0) {
      return '${_pad(h)}:${_pad(m)}:${_pad(s)}';
    }
    return '${_pad(m)}:${_pad(s)}';
  }

  static String _pad(int n) => n.toString().padLeft(2, '0');
}
