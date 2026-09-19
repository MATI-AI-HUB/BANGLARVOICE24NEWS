// =============================================================================
// specialists/router.ts — detect section, dispatch to the right specialist.
// =============================================================================

import type { WorkerConfig } from "../../config.js";
import type { DraftArticle } from "../types.js";
import type { SectionKey, SpecialistVerdict } from "./types.js";
import { BaseSpecialist } from "./base.js";
import { PoliticsSpecialist } from "./politics.js";
import { HealthSpecialist } from "./health.js";
import { SportsSpecialist } from "./sports.js";
import { EconomicsSpecialist } from "./economics.js";
import { InternationalSpecialist } from "./international.js";
import { NationalSpecialist } from "./national.js";

const REGISTRY: Record<SectionKey, () => BaseSpecialist> = {
  politics: () => new PoliticsSpecialist(),
  health: () => new HealthSpecialist(),
  sports: () => new SportsSpecialist(),
  economics: () => new EconomicsSpecialist(),
  international: () => new InternationalSpecialist(),
  national: () => new NationalSpecialist(),
  technology: () => new NationalSpecialist(),
  entertainment: () => new NationalSpecialist(),
};

const KEYWORD_HINTS: Array<{ section: SectionKey; keys: string[] }> = [
  { section: "politics",      keys: ["নির্বাচন", "সংসদ", "মন্ত্রী", "প্রধানমন্ত্রী", "রাজনীতি", "সরকার", "দল"] },
  { section: "health",        keys: ["স্বাস্থ্য", "ঔষধ", "চিকিৎসা", "রোগ", "ভ্যাকসিন", "ডেঙ্গু", "ক্যান্সার"] },
  { section: "sports",        keys: ["ক্রিকেট", "ফুটবল", "খেলা", "ম্যাচ", "কোচ", "খেলোয়াড়"] },
  { section: "economics",     keys: ["অর্থনীতি", "ডলার", "টাকা", "ব্যাংক", "বাজেট", "রিজার্ভ", "আয়কর"] },
  { section: "international", keys: ["আন্তর্জাতিক", "যুদ্ধ", "ট্রাম্প", "বাইডেন", "জাতিসংঘ", "ভারত", "চীন"] },
];

export function detectSection(draft: DraftArticle): SectionKey {
  const cat = (draft.raw.sourceCategory || "").toLowerCase();
  const known: SectionKey[] = [
    "politics", "health", "sports", "economics", "international", "national",
    "technology", "entertainment",
  ];
  if (known.includes(cat as SectionKey)) return cat as SectionKey;

  const hay = (draft.titleBn + " " + draft.contentBn).toLowerCase();
  for (const { section, keys } of KEYWORD_HINTS) {
    if (keys.some((k) => hay.includes(k.toLowerCase()))) return section;
  }
  return "national";
}

export function pickSpecialist(section: SectionKey): BaseSpecialist {
  const factory = REGISTRY[section] || REGISTRY.national;
  return factory();
}

export async function verifyDraft(
  cfg: WorkerConfig,
  draft: DraftArticle,
): Promise<SpecialistVerdict> {
  const section = detectSection(draft);
  const specialist = pickSpecialist(section);
  return specialist.verify(cfg, { draft, section });
}
