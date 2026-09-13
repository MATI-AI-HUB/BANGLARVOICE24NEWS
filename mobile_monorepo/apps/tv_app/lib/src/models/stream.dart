class StreamInfo {
  final String streamUrl;
  final String title;
  final String nowPlaying;
  final bool isLive;
  final String? thumbnail;

  const StreamInfo({
    required this.streamUrl,
    required this.title,
    required this.nowPlaying,
    required this.isLive,
    this.thumbnail,
  });

  factory StreamInfo.fromJson(Map<String, dynamic> json) {
    return StreamInfo(
      streamUrl: json['stream_url'] as String? ?? '',
      title: json['title'] as String? ?? 'বাংলার ভয়েস ২৪/৭',
      nowPlaying: json['now_playing'] as String? ?? '',
      isLive: json['is_live'] as bool? ?? false,
      thumbnail: json['thumbnail'] as String?,
    );
  }

  static const empty = StreamInfo(
    streamUrl: '',
    title: 'বাংলার ভয়েস ২৪/৭',
    nowPlaying: 'সংযোগ নেই',
    isLive: false,
  );
}
