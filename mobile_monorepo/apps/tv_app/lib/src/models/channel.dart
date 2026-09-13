class TvChannel {
  final String id;
  final String nameBn;
  final String streamUrl;
  final String type; // 'video' | 'audio'
  final String? logo;

  const TvChannel({
    required this.id,
    required this.nameBn,
    required this.streamUrl,
    this.type = 'video',
    this.logo,
  });

  factory TvChannel.fromJson(Map<String, dynamic> json) {
    return TvChannel(
      id: json['id']?.toString() ?? '',
      nameBn: json['name_bn'] as String? ?? '',
      streamUrl: json['stream_url'] as String? ?? '',
      type: json['type'] as String? ?? 'video',
      logo: json['logo'] as String?,
    );
  }

  bool get isVideo => type == 'video';
  bool get isAudio => type == 'audio';

  static const fallback = <TvChannel>[
    TvChannel(
      id: 'main',
      nameBn: 'প্রধান চ্যানেল',
      streamUrl: '',
      type: 'video',
    ),
    TvChannel(
      id: 'audio',
      nameBn: 'অডিও ২৪/৭',
      streamUrl: '',
      type: 'audio',
    ),
  ];
}
