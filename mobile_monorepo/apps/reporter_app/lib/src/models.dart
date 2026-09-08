/// Banglar Voice Field Reporter — domain models.
library;

import 'package:flutter/material.dart';

/// Who is filing the report.
enum ReporterRole { staff, citizen }

extension ReporterRoleX on ReporterRole {
  String get label => switch (this) {
        ReporterRole.staff => 'স্টাফ রিপোর্টার',
        ReporterRole.citizen => 'নাগরিক সাংবাদিক',
      };

  String get code => switch (this) {
        ReporterRole.staff => 'staff',
        ReporterRole.citizen => 'citizen',
      };

  bool get isStaff => this == ReporterRole.staff;

  /// Staff reporters are pre-verified → their report goes to the editors as a
  /// "publish request" that can be approved fast; citizens need editor review.
  bool get needsEditorApproval => this == ReporterRole.citizen;
}

/// Media type chosen on the capture screen.
enum CaptureMode { photo, video, audio, text }

extension CaptureModeX on CaptureMode {
  String get label => switch (this) {
        CaptureMode.photo => 'PHOTO',
        CaptureMode.video => 'VIDEO',
        CaptureMode.audio => 'AUDIO',
        CaptureMode.text => 'TEXT',
      };

  IconData get icon => switch (this) {
        CaptureMode.photo => Icons.photo_camera_outlined,
        CaptureMode.video => Icons.videocam_outlined,
        CaptureMode.audio => Icons.mic_outlined,
        CaptureMode.text => Icons.notes,
      };
}

/// Lifecycle of a field report as seen by the reporter.
enum ReportStatus { queued, sending, sent, pending, approved, rejected }

extension ReportStatusX on ReportStatus {
  String get label => switch (this) {
        ReportStatus.queued => 'অফলাইনে সংরক্ষিত',
        ReportStatus.sending => 'পাঠানো হচ্ছে…',
        ReportStatus.sent => 'পাঠানো হয়েছে',
        ReportStatus.pending => 'এডিটর রিভিউতে',
        ReportStatus.approved => 'অনুমোদিত',
        ReportStatus.rejected => 'প্রত্যাখ্যাত',
      };

  /// Status chip colors used in My Reports.
  Color color(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    switch (this) {
      case ReportStatus.approved:
        return const Color(0xFF15803D);
      case ReportStatus.rejected:
        return const Color(0xFFB91C1C);
      case ReportStatus.pending:
        return const Color(0xFFB45309);
      case ReportStatus.sending:
        return const Color(0xFF1D4ED8);
      case ReportStatus.sent:
        return dark ? const Color(0xFF93C5FD) : const Color(0xFF1E40AF);
      case ReportStatus.queued:
        return const Color(0xFF64748B);
    }
  }

  IconData get icon => switch (this) {
        ReportStatus.approved => Icons.check_circle,
        ReportStatus.rejected => Icons.cancel,
        ReportStatus.pending => Icons.hourglass_top,
        ReportStatus.sending => Icons.cloud_upload_outlined,
        ReportStatus.sent => Icons.cloud_done_outlined,
        ReportStatus.queued => Icons.cloud_off_outlined,
      };
}

/// One field report draft (offline-first; JSON-serialised to disk).
class FieldReport {
  final String id;
  final String title;
  final String body;
  final String category;
  final String sourceName;
  final String? sourcePhone;
  final double? lat;
  final double? lng;
  final String? placeLabel; // e.g. "ঘোড়াঘাট, দিনাজপুর"
  final String? mediaPath; // captured file (if any)
  final CaptureMode? mediaType;
  final String locationTag; // reverse-geocoded or manual
  final DateTime capturedAt;
  final DateTime updatedAt;
  final ReporterRole role;
  final ReportStatus status;

  const FieldReport({
    required this.id,
    required this.title,
    required this.body,
    required this.category,
    required this.sourceName,
    this.sourcePhone,
    this.lat,
    this.lng,
    this.placeLabel,
    this.mediaPath,
    this.mediaType,
    required this.locationTag,
    required this.capturedAt,
    required this.updatedAt,
    required this.role,
    required this.status,
  });

  FieldReport copyWith({
    String? title,
    String? body,
    String? category,
    String? sourceName,
    String? sourcePhone,
    double? lat,
    double? lng,
    String? placeLabel,
    String? mediaPath,
    CaptureMode? mediaType,
    String? locationTag,
    DateTime? capturedAt,
    DateTime? updatedAt,
    ReporterRole? role,
    ReportStatus? status,
  }) {
    return FieldReport(
      id: id,
      title: title ?? this.title,
      body: body ?? this.body,
      category: category ?? this.category,
      sourceName: sourceName ?? this.sourceName,
      sourcePhone: sourcePhone ?? this.sourcePhone,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      placeLabel: placeLabel ?? this.placeLabel,
      mediaPath: mediaPath ?? this.mediaPath,
      mediaType: mediaType ?? this.mediaType,
      locationTag: locationTag ?? this.locationTag,
      capturedAt: capturedAt ?? this.capturedAt,
      updatedAt: updatedAt ?? this.updatedAt,
      role: role ?? this.role,
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'body': body,
        'category': category,
        'source_name': sourceName,
        'source_phone': sourcePhone,
        'lat': lat,
        'lng': lng,
        'place_label': placeLabel,
        'media_path': mediaPath,
        'media_type': mediaType?.name,
        'location_tag': locationTag,
        'captured_at': capturedAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        'role': role.code,
        'status': status.name,
      };

  factory FieldReport.fromJson(Map<String, dynamic> j) => FieldReport(
        id: (j['id'] ?? '').toString(),
        title: (j['title'] ?? '').toString(),
        body: (j['body'] ?? '').toString(),
        category: (j['category'] ?? '').toString(),
        sourceName: (j['source_name'] ?? '').toString(),
        sourcePhone: j['source_phone']?.toString(),
        lat: (j['lat'] as num?)?.toDouble(),
        lng: (j['lng'] as num?)?.toDouble(),
        placeLabel: j['place_label']?.toString(),
        mediaPath: j['media_path']?.toString(),
        mediaType: j['media_type'] == null
            ? null
            : CaptureMode.values.firstWhere(
                (e) => e.name == j['media_type'],
                orElse: () => CaptureMode.photo,
              ),
        locationTag: (j['location_tag'] ?? '').toString(),
        capturedAt: DateTime.tryParse((j['captured_at'] ?? '').toString()) ??
            DateTime.now(),
        updatedAt: DateTime.tryParse((j['updated_at'] ?? '').toString()) ??
            DateTime.now(),
        role: (j['role'] ?? 'citizen').toString() == 'staff'
            ? ReporterRole.staff
            : ReporterRole.citizen,
        status: ReportStatus.values.firstWhere(
          (e) => e.name == (j['status'] ?? 'queued'),
          orElse: () => ReportStatus.queued,
        ),
      );
}

/// Ordered list of editorial categories for the draft dropdown.
const List<String> kCategories = [
  'জাতীয়',
  'দুর্ঘটনা',
  'রাজনীতি',
  'অপরাধ',
  'স্থানীয়',
  'খেলা',
  'বাণিজ্য',
  'আবহাওয়া',
  'শিক্ষা',
  'স্বাস্থ্য',
  'সার্বজনীন',
  'অন্যান্য',
];
