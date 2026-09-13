class ScheduleEntry {
  final String time; // "০৬:০০"
  final String title;
  final bool isNow;
  final bool isPast;

  const ScheduleEntry({
    required this.time,
    required this.title,
    this.isNow = false,
    this.isPast = false,
  });

  factory ScheduleEntry.fromJson(Map<String, dynamic> json) {
    return ScheduleEntry(
      time: json['time'] as String? ?? '',
      title: json['title'] as String? ?? '',
      isNow: json['is_now'] as bool? ?? false,
      isPast: json['is_past'] as bool? ?? false,
    );
  }

  static const fallback = <ScheduleEntry>[
    ScheduleEntry(time: '০৬:০০', title: 'সকালের সংবাদ'),
    ScheduleEntry(time: '০৯:০০', title: 'অর্থনীতি ডেস্ক'),
    ScheduleEntry(time: '১২:০০', title: 'মধ্যাহ্ন সংবাদ'),
    ScheduleEntry(time: '১৫:০০', title: 'খেলাধুলা'),
    ScheduleEntry(time: '১৮:০০', title: 'প্রধান সংবাদ'),
    ScheduleEntry(time: '২১:০০', title: 'রাতের সংবাদ'),
  ];
}
