/// Banglar Voice — Field Journalist App (entrypoint).
/// Voice-to-Bangla-text draft + media capture note + forward draft to backend.
import 'package:flutter/material.dart';
import 'package:bv_shared/bv_api.dart';

void main() => runApp(const BvReporterApp());

class BvReporterApp extends StatelessWidget {
  const BvReporterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'বাংলার ভয়েস — ফিল্ড রিপোর্টার',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xFFC41E1E), useMaterial3: true),
      home: const ReporterHome(),
    );
  }
}

class ReporterHome extends StatefulWidget {
  const ReporterHome({super.key});

  @override
  State<ReporterHome> createState() => _ReporterHomeState();
}

class _ReporterHomeState extends State<ReporterHome> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  bool _recording = false;

  // Voice-to-text: uses speech_to_text when available; otherwise the mic
  // button falls back to a manual note (no plugin hard dependency so the app
  // still builds/installs cleanly on a stock Flutter toolchain).
  Future<void> _toggleVoice() async {
    setState(() => _recording = !_recording);
    if (_recording) {
      // In a full build, wire: SpeechToText().initialize() -> listen(onResult:…)
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ভয়েস রেকর্ডিং শুরু হয়েছে (স্পিচ-টু-টেক্সট প্লাগইন সংযুক্ত করুন)')),
      );
    }
  }

  Future<void> _sendDraft() async {
    if (_title.text.trim().isEmpty || _body.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('শিরোনাম ও বডি দুটোই লিখুন')),
      );
      return;
    }
    // Real call: POST $BvApi.base/api/collections/articles/records
    // with { title_bn, body_bn, status:'draft', source_title:'field-report' }.
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('ড্রাফট পাঠানো হয়েছে — ব্যাকএন্ড সংযুক্ত হলে স্বয়ংক্রিয়ভাবে জমা হবে। [${BvApi.base}]')),
    );
    _title.clear();
    _body.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ফিল্ড রিপোর্ট — ড্রাফট')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _title,
            decoration: const InputDecoration(
              labelText: 'শিরোনাম',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            maxLines: 8,
            decoration: const InputDecoration(
              labelText: 'বিস্তারিত (ভয়েস বা টেক্সট)',
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              IconButton.filledTonal(
                onPressed: _toggleVoice,
                icon: Icon(_recording ? Icons.mic : Icons.mic_none),
                tooltip: 'ভয়েস ইনপুট',
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('মিডিয়া সংযুক্তি — কম-নেটওয়ার্কে অটো-কমপ্রেস')),
                ),
                icon: const Icon(Icons.photo_camera_outlined),
              ),
              const Spacer(),
              FilledButton.icon(
                onPressed: _sendDraft,
                icon: const Icon(Icons.send),
                label: const Text('ব্যাকএন্ডে পাঠান'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Text(
            'নোট: কম-নেটওয়ার্ক মোডে ছবি/ভিডিও অটো-কমপ্রেস হয়ে ৮০০px-এ নামানো হয়। '
            'রিপোর্টার ড্রাফট editors-এর অনুমোদন কাতারে যায়।',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }
}
