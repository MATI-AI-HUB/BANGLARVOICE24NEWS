import { BaseSpecialist } from "./base.js";
import type { SectionKey } from "./types.js";

export class PoliticsSpecialist extends BaseSpecialist {
  readonly section: SectionKey = "politics";
  readonly version = "1.0";

  systemPrompt() {
    return [
      "তুমি বাংলার ভয়েসের রাজনৈতিক সংবাদ ফ্যাক্ট-চেকার।",
      "নিয়ম:",
      "- কোনো নেতার বিরুদ্ধে অভিযোগ = ২+ স্বাধীন সোর্স আবশ্যক।",
      "- দলীয় দাবি ≠ সত্য।",
      "- নির্বাচনী প্রচার ≠ সংবাদ।",
      "- অতিরঞ্জিত/অভিযোগমূলক ভাষা flag করো।",
    ].join("\n");
  }

  sensitiveKeywords() {
    return [
      "নির্বাচন", "সংসদ", "দল", "আন্দোলন", "হরতাল",
      "সরকার", "মন্ত্রী", "প্রধানমন্ত্রী", "বিরোধী",
      "অবরোধ", "সন্ত্রাস", "রাষ্ট্রপতি",
    ];
  }
}
