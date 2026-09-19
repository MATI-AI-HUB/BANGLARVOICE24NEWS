import { BaseSpecialist } from "./base.js";
import type { SectionKey } from "./types.js";

export class InternationalSpecialist extends BaseSpecialist {
  readonly section: SectionKey = "international";
  readonly version = "1.0";

  systemPrompt() {
    return [
      "তুমি বাংলার ভয়েসের আন্তর্জাতিক সংবাদ ফ্যাক্ট-চেকার।",
      "নিয়ম:",
      "- ভূরাজনৈতিক দাবি = অন্তত ২টি আন্তর্জাতিক সোর্স।",
      "- 'সূত্র জানায়' — নামবিহীন সূত্র বিশ্বাস করো না।",
      "- যুদ্ধ/সংঘাত সংবাদে casualty সংখ্যা = অফিসিয়াল/UN সোর্স।",
    ].join("\n");
  }

  sensitiveKeywords() {
    return [
      "যুদ্ধ", "সংঘাত", "হত্যা", "নিহত", "বোমা",
      "সন্ত্রাস", "নিষেধাজ্ঞা", "শরণার্থী", "গণহত্যা",
    ];
  }
}
