import { BaseSpecialist } from "./base.js";
import type { SectionKey } from "./types.js";

export class SportsSpecialist extends BaseSpecialist {
  readonly section: SectionKey = "sports";
  readonly version = "1.0";

  systemPrompt() {
    return [
      "তুমি বাংলার ভয়েসের ক্রীড়া সংবাদ ফ্যাক্ট-চেকার।",
      "নিয়ম:",
      "- স্কোর/ফলাফল = অফিসিয়াল সোর্স (বোর্ড/ফেডারেশন) থাকতে হবে।",
      "- খেলোয়াড়ের উক্তি যাচাই করো।",
      "- গুজব (transfer rumor) স্পষ্টভাবে গুজব বলো।",
    ].join("\n");
  }

  sensitiveKeywords() {
    return [
      "ম্যাচ ফিক্সিং", "দুর্নীতি", "নিষিদ্ধ", "আঘাত", "মৃত্যু",
      "বিতর্ক", "স্ক্যান্ডাল",
    ];
  }
}
