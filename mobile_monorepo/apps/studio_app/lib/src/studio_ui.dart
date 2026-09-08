/// Shared studio UI helpers — step rail, brand chips, honest status banners.
library;

import 'package:flutter/material.dart';

import 'config.dart';

/// Red/blue brand colors for on-screen studio chrome.
Color get studioRed => const Color(StudioConfig.brandRed);
Color get studioNavy => const Color(StudioConfig.deepBlue);

/// Step indicator rail (১ সেটআপ → ২ ওভারলে → ৩ গো-লাইভ → ৪ কন্ট্রোল).
class StudioStepRail extends StatelessWidget {
  final int current; // 1..4
  const StudioStepRail({super.key, required this.current});

  @override
  Widget build(BuildContext context) {
    const steps = ['সেটআপ', 'ওভারলে', 'গো-লাইভ', 'কন্ট্রোল'];
    return Row(
      children: List.generate(steps.length * 2 - 1, (i) {
        if (i.isOdd) {
          return Expanded(
            child: Container(height: 2, color: i ~/ 2 < current - 1 ? studioRed : Colors.white12),
          );
        }
        final idx = i ~/ 2 + 1;
        final done = idx < current;
        final active = idx == current;
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: done || active ? studioRed : Colors.white10,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            steps[idx - 1],
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white),
          ),
        );
      }),
    );
  }
}

/// "কী নেই" honest status chip for unprovisioned infrastructure.
class NotWiredChip extends StatelessWidget {
  final String text;
  const NotWiredChip({super.key, this.text = 'ব্যাকএন্ড/কী প্রোভিশন করা হয়নি'});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withValues(alpha: .15),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: .5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.construction, size: 13, color: Color(0xFFFBBF24)),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              text,
              style: const TextStyle(fontSize: 11, color: Color(0xFFFDE68A), fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

/// Small labelled action tile used across studio screens.
class StudioActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String hint;
  final Color? iconColor;
  final VoidCallback? onTap;
  final bool disabled;
  const StudioActionTile({
    super.key,
    required this.icon,
    required this.label,
    required this.hint,
    this.iconColor,
    this.onTap,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = disabled ? Colors.white24 : (iconColor ?? studioRed);
    return Material(
      color: Colors.white.withValues(alpha: disabled ? .03 : .07),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: disabled ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: .18),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(hint,
                        style: TextStyle(fontSize: 11.5, color: Colors.white.withValues(alpha: .55))),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.white38),
            ],
          ),
        ),
      ),
    );
  }
}
