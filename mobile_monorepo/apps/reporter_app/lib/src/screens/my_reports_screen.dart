/// My Reports — list of submitted/queued field reports with status chips
/// (queued → sending → sent → pending → approved / rejected), offline sync
/// state, pull-to-refresh, and tap-to-view details.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../services/offline_queue.dart';
import '../theme.dart';

class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  @override
  void initState() {
    super.initState();
    OfflineQueue.instance.addListener(_onQueue);
  }

  @override
  void dispose() {
    OfflineQueue.instance.removeListener(_onQueue);
    super.dispose();
  }

  void _onQueue() {
    if (mounted) setState(() {});
  }

  String _time(DateTime t) => DateFormat('d MMM yyyy, h:mm a', 'bn_BD')
      .format(t.toLocal());

  Future<void> _sync() async {
    await OfflineQueue.instance.syncNow();
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final reports = OfflineQueue.instance.reports;
    final online = OfflineQueue.instance.isOnline;
    return Scaffold(
      appBar: AppBar(
        title: const Text('আমার রিপোর্ট'),
        actions: [
          IconButton(
            tooltip: online ? 'সিঙ্ক করুন' : 'অফলাইন — আবার চেষ্টা করুন',
            onPressed: _sync,
            icon: Icon(online ? Icons.sync : Icons.sync_disabled),
          ),
        ],
        bottom: reports.isNotEmpty
            ? PreferredSize(
                preferredSize: const Size.fromHeight(36),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: (online ? const Color(0xFF0E7490) : const Color(0xFFB45309))
                            .withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            online ? Icons.cloud_done : Icons.cloud_off,
                            size: 14,
                            color:
                                online ? const Color(0xFF0E7490) : const Color(0xFFB45309),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            online
                                ? '${reports.length}টি — সার্ভারে সিঙ্কড'
                                : '${reports.length}টি — অফলাইন, ${reports.where((r) => r.status == ReportStatus.queued).length}টি অপেক্ষমাণ',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: online
                                  ? const Color(0xFF0E7490)
                                  : const Color(0xFFB45309),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              )
            : null,
      ),
      body: RefreshIndicator(
        onRefresh: _sync,
        child: reports.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Icon(Icons.inbox_outlined, size: 64, color: Colors.black26),
                  SizedBox(height: 12),
                  Center(
                    child: Text(
                      'এখনও কোনো রিপোর্ট নেই',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.black45,
                      ),
                    ),
                  ),
                  SizedBox(height: 6),
                  Center(
                    child: Text(
                      'ক্যাপচার → ড্রাফট থেকে আপনার প্রথম রিপোর্ট পাঠান',
                      style: TextStyle(fontSize: 13, color: Colors.black38),
                    ),
                  ),
                ],
              )
            : ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(14),
                itemCount: reports.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final r = reports[i];
                  return _ReportCard(
                    report: r,
                    timeText: _time(r.capturedAt),
                    onTap: () {
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        shape: const RoundedRectangleBorder(
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(20),
                          ),
                        ),
                        builder: (_) => _ReportDetailSheet(report: r),
                      );
                    },
                  );
                },
              ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final FieldReport report;
  final String timeText;
  final VoidCallback onTap;

  const _ReportCard({
    required this.report,
    required this.timeText,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final status = report.status;
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1EEEA),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      report.category,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF55514B),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    timeText,
                    style: const TextStyle(fontSize: 11, color: Colors.black45),
                  ),
                  const Spacer(),
                  _StatusChip(status: status),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                report.title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  height: 1.3,
                  fontFamily: 'NotoSerifBengali',
                ),
              ),
              if (report.body.trim().isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  report.body.trim(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Colors.black54,
                    height: 1.5,
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.person_outline, size: 14, color: Colors.black45),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      report.sourceName,
                      style: const TextStyle(
                          fontSize: 12, color: Colors.black54),
                    ),
                  ),
                  Icon(Icons.location_on_outlined,
                      size: 14, color: Colors.black45),
                  const SizedBox(width: 2),
                  Flexible(
                    child: Text(
                      report.locationTag,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, color: Colors.black54),
                    ),
                  ),
                  if (report.mediaType != null) ...[
                    const SizedBox(width: 8),
                    Icon(report.mediaType!.icon, size: 15, color: kBrandRed),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final ReportStatus status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = status.color(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(status.icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            status.label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportDetailSheet extends StatelessWidget {
  final FieldReport report;
  const _ReportDetailSheet({required this.report});

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.black26,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              report.title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                height: 1.25,
                fontFamily: 'NotoSerifBengali',
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 15, color: Colors.black54),
                const SizedBox(width: 5),
                Text(report.sourceName,
                    style: const TextStyle(
                        fontSize: 13, color: Colors.black54)),
                const SizedBox(width: 12),
                const Icon(Icons.schedule, size: 14, color: Colors.black45),
                const SizedBox(width: 4),
                Text(
                  DateFormat('d MMM yyyy, h:mm a').format(report.capturedAt.toLocal()),
                  style: const TextStyle(fontSize: 12, color: Colors.black45),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1EEEA),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    report.category,
                    style: const TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(width: 8),
                _StatusChip(status: report.status),
              ],
            ),
            if (report.body.trim().isNotEmpty) ...[
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7F5F2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  report.body.trim(),
                  style: const TextStyle(fontSize: 14, height: 1.6),
                ),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 15, color: Colors.black54),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    report.locationTag,
                    style: const TextStyle(
                        fontSize: 13, color: Colors.black54),
                  ),
                ),
              ],
            ),
            if (report.mediaType != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(report.mediaType!.icon, size: 15, color: kBrandRed),
                  const SizedBox(width: 6),
                  Text(
                    report.mediaPath ?? '${report.mediaType!.label} মিডিয়া',
                    style: const TextStyle(fontSize: 13, color: Colors.black54),
                  ),
                ],
              ),
            ],
            if (report.lat != null && report.lng != null) ...[
              const SizedBox(height: 8),
              Text(
                'GPS: ${report.lat!.toStringAsFixed(5)}, ${report.lng!.toStringAsFixed(5)}',
                style: const TextStyle(
                    fontSize: 12,
                    color: Colors.black45,
                    fontFamily: 'monospace'),
              ),
            ],
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close),
                label: const Text('বন্ধ করুন'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}