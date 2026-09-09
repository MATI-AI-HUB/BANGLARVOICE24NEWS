/// Draft screen — Bangla title, description, category dropdown, source info,
/// media preview, offline indicator, upload progress to the backend queue.
/// Accepts an optional prefill from the Capture screen (media label/mode).
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../models.dart';
import '../services/capture_service.dart';
import '../services/offline_queue.dart';
import '../services/reporter_session.dart';
import '../theme.dart';

class DraftScreen extends StatefulWidget {
  const DraftScreen({super.key, this.prefillMode, this.prefillMediaLabel});

  final CaptureMode? prefillMode;
  final String? prefillMediaLabel;

  @override
  State<DraftScreen> createState() => _DraftScreenState();
}

class _DraftScreenState extends State<DraftScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  final _sourceName = TextEditingController();
  final _sourcePhone = TextEditingController();
  final _location = TextEditingController();
  String _category = kCategories.first;
  CaptureMode? _mode;
  String? _mediaLabel;
  bool _sending = false;
  double _progress = 0;

  @override
  void initState() {
    super.initState();
    _mode = widget.prefillMode;
    _mediaLabel = widget.prefillMediaLabel;
    if (_mediaLabel != null) {
      _body.text = _mediaLabel! + '\n';
    }
    final s = SessionStore.current;
    if (s != null) {
      _sourceName.text = s.name;
      _sourcePhone.text = s.phone;
    }
    _location.text = 'ঘোড়াঘাট, দিনাজপুর'; // sample; replaced by GPS when wired
    OfflineQueue.instance.addListener(_onQueue);
  }

  void _onQueue() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    OfflineQueue.instance.removeListener(_onQueue);
    super.dispose();
  }

  Future<void> _pickLocation() async {
    final loc = await LocationService.instance.current();
    if (!mounted) return;
    setState(() => _location.text = loc.rawTag);
  }

  Future<void> _submit() async {
    final s = SessionStore.current;
    if (s == null) return;
    if (_title.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('শিরোনাম লিখুন')));
      return;
    }
    setState(() {
      _sending = true;
      _progress = 0;
    });

    // Animate upload progress while the queue enqueues; the real transport is
    // OfflineQueue.syncNow (HTTP POST when online, queued when offline).
    final report = FieldReport(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      title: _title.text.trim(),
      body: _body.text.trim(),
      category: _category,
      sourceName: _sourceName.text.trim().isEmpty
          ? s.name
          : _sourceName.text.trim(),
      sourcePhone: _sourcePhone.text.trim().isEmpty
          ? null
          : _sourcePhone.text.trim(),
      locationTag: _location.text.trim().isEmpty
          ? 'অজানা অবস্থান'
          : _location.text.trim(),
      placeLabel: _location.text.trim().isEmpty ? null : _location.text.trim(),
      mediaPath: _mediaLabel,
      mediaType: _mode,
      capturedAt: DateTime.now(),
      updatedAt: DateTime.now(),
      role: s.role,
      status: OfflineQueue.instance.isOnline
          ? ReportStatus.queued
          : ReportStatus.queued,
    );

    await OfflineQueue.instance.enqueue(report);

    // Small staged progress for UX; the queue flushes immediately if online.
    for (final p in [0.3, 0.65, 1.0]) {
      await Future<void>.delayed(const Duration(milliseconds: 140));
      if (mounted) setState(() => _progress = p);
    }
    if (!mounted) return;

    setState(() {
      _sending = false;
      _progress = 1;
    });
    final sentOnline = OfflineQueue.instance.isOnline;
    final needsApproval = s.role.needsEditorApproval;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          sentOnline
              ? (needsApproval
                    ? 'পাঠানো হয়েছে — এডিটর অনুমোদনের অপেক্ষায় (pending)'
                    : 'পাঠানো হয়েছে — পাবলিশ রিকোয়েস্ট জমা হয়েছে')
              : 'অফলাইন সেভ — পরে অটো সেন্ড হবে',
        ),
      ),
    );
    _title.clear();
    _body.clear();
  }

  @override
  Widget build(BuildContext context) {
    final isOnline = OfflineQueue.instance.isOnline;
    final s = SessionStore.current;
    return Scaffold(
      appBar: AppBar(
        title: const Text('ড্রাফট তৈরি'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(40),
          child: Container(
            width: double.infinity,
            color: isOnline
                ? const Color(0xFF0E7490).withValues(alpha: 0.15)
                : const Color(0xFFB45309).withValues(alpha: 0.15),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Icon(
                  isOnline ? Icons.wifi : Icons.cloud_off,
                  size: 16,
                  color: isOnline
                      ? const Color(0xFF0E7490)
                      : const Color(0xFFB45309),
                ),
                const SizedBox(width: 8),
                Text(
                  isOnline
                      ? 'অনলাইন — জমা দিলে সাথে সাথে পাঠাবে'
                      : 'অফলাইন সেভ — পরে অটো সেন্ড হবে',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isOnline
                        ? const Color(0xFF0E7490)
                        : const Color(0xFFB45309),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_mediaLabel != null)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(_mode?.icon ?? Icons.attach_file, color: kBrandRed),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _mediaLabel!,
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  const Icon(
                    Icons.check_circle,
                    size: 18,
                    color: Color(0xFF15803D),
                  ),
                ],
              ),
            ),
          TextField(
            controller: _title,
            maxLength: 160,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              fontFamily: 'NotoSerifBengali',
            ),
            decoration: const InputDecoration(
              labelText: 'শিরোনাম (বাংলা)',
              hintText: 'যেমন: দিনাজপুরে ট্রাক-অটোরিকশা সংঘর্ষে নিহত ৩',
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(labelText: 'বিভাগ'),
            items: kCategories
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => _category = v ?? _category),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            minLines: 5,
            maxLines: 12,
            decoration: const InputDecoration(
              labelText: 'বিস্তারিত বিবরণ',
              hintText: 'কী ঘটেছে, কখন, কোথায় — সাক্ষীদের বক্তব্য…',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _sourceName,
                  decoration: const InputDecoration(
                    labelText: 'উৎস/প্রতিবেদকের নাম',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: _sourcePhone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'মোবাইল',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _location,
            decoration: InputDecoration(
              labelText: '📍 অবস্থান (অটো-ট্যাগ)',
              prefixIcon: const Icon(Icons.location_on_outlined),
              suffixIcon: IconButton(
                onPressed: _pickLocation,
                icon: const Icon(Icons.my_location),
                tooltip: 'GPS থেকে নিন',
              ),
            ),
          ),
          const SizedBox(height: 20),

          if (_sending)
            Column(
              children: [
                LinearProgressIndicator(
                  value: _progress,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(6),
                ),
                const SizedBox(height: 8),
                Text(
                  'আপলোড হচ্ছে… ${(_progress * 100).round()}%',
                  style: const TextStyle(fontSize: 12),
                ),
                const SizedBox(height: 12),
              ],
            ),

          FilledButton.icon(
            onPressed: _sending ? null : _submit,
            icon: const Icon(Icons.send),
            label: Text(
              s != null && s.role.isStaff
                  ? 'পাবলিশ রিকোয়েস্ট পাঠান'
                  : 'এডিটর অনুমোদনের জন্য পাঠান',
            ),
          ),
          const SizedBox(height: 12),
          Text(
            s != null && s.role.needsEditorApproval
                ? 'নাগরিক সাংবাদিক রিপোর্ট → এডিটর রিভিউ → অনুমোদিত হলে প্রকাশিত'
                : 'স্টাফ রিপোর্ট → ডেস্ক এডিটর দ্রুত অ্যাপ্রুভ করবেন',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
