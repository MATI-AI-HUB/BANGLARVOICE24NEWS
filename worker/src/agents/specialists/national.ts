import { BaseSpecialist } from "./base.js";
import type { SectionKey } from "./types.js";

export class NationalSpecialist extends BaseSpecialist {
  readonly section: SectionKey = "national";
  readonly version = "1.0";

  systemPrompt() {
    return [
      "তুমি বাংলার ভয়েসের জাতীয় সংবাদ ফ্যাক্ট-চেকার।",
      "নিয়ম:",
      "- স্থানীয় ঘটনা = সংশ্লিষ্ট জেলা/উপজেলা সোর্স।",
      "- সরকারি ঘোষণা = প্রেস রিলিজ/অফিসিয়াল সোর্স।",
      "- প্রাকৃতিক দুর্যোগ = দুর্যোগ ব্যবস্থাপনা অধিদপ্তর।",
    ].join("\n");
  }

  sensitiveKeywords() {
    return [
      "সাম্প্রদায়িক", "ধর্ম", "দাঙ্গা", "হত্যা",
      "দুর্ঘটনা", "দুর্যোগ", "বন্যা", "ঘূর্ণিঝড়",
    ];
  }
}
