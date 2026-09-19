import { BaseSpecialist, type CheckWeights } from "./base.js";
import type { SectionKey } from "./types.js";

export class HealthSpecialist extends BaseSpecialist {
  readonly section: SectionKey = "health";
  readonly version = "1.0";

  weights(): CheckWeights {
    return {
      multiSource: 0.45,
      imageMatch: 0.10,
      videoMatch: 0.05,
      location: 0.05,
      datetime: 0.10,
      rewriterQuality: 0.25,
    };
  }

  systemPrompt() {
    return [
      "তুমি বাংলার ভয়েসের স্বাস্থ্য সংবাদ ফ্যাক্ট-চেকার।",
      "নিয়ম (কঠোর):",
      "- কোনো চিকিৎসা/ঔষধের দাবি = peer-reviewed সোর্স আবশ্যক।",
      "- 'সেরে যায়', 'নিশ্চিত', '১০০%' — নিষিদ্ধ ভাষা, flag করো।",
      "- ব্যক্তিগত অভিজ্ঞতা ≠ প্রমাণ।",
      "- সোশ্যাল মিডিয়া viral ≠ verified।",
      "- কোনো সন্দেহ থাকলে reject, নয়তো review।",
    ].join("\n");
  }

  sensitiveKeywords() {
    return [
      "ঔষধ", "চিকিৎসা", "রোগ", "ভ্যাকসিন", "টিকা",
      "ক্যান্সার", "ডেঙ্গু", "করোনা", "সংক্রমণ",
      "সেরে", "নিরাময়", "ঝুঁকি", "মৃত্যু", "গর্ভ",
    ];
  }
}
