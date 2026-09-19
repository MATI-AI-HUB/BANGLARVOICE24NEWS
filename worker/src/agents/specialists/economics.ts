import { BaseSpecialist } from "./base.js";
import type { SectionKey } from "./types.js";

export class EconomicsSpecialist extends BaseSpecialist {
  readonly section: SectionKey = "economics";
  readonly version = "1.0";

  systemPrompt() {
    return [
      "তুমি বাংলার ভয়েসের অর্থনৈতিক সংবাদ ফ্যাক্ট-চেকার।",
      "নিয়ম:",
      "- সংখ্যা/ডেটা = সরকারি/আন্তর্জাতিক সোর্স (BBS, IMF, WB) থাকতে হবে।",
      "- 'কোটি টাকা', 'শতাংশ' — সোর্স ছাড়া গ্রহণ করো না।",
      "- ভবিষ্যদ্বাণী ≠ সত্য।",
    ].join("\n");
  }

  sensitiveKeywords() {
    return [
      "দুর্নীতি", "কেলেঙ্কারি", "ঋণ", "ব্যাংক", "ডলার",
      "রিজার্ভ", "বাজেট", "রাজস্ব", "আয়কর",
    ];
  }
}
