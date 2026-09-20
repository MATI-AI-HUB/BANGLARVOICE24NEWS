import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

type CategoryKey =
  | "national"
  | "politics"
  | "economy"
  | "sports"
  | "entertainment"
  | "tech"
  | "health"
  | "education"
  | "international"
  | "city";

type RiskLevel = "low" | "medium" | "high" | "critical";

type PublicationDecision = {
  risk_level: RiskLevel;
  status: "published" | "pending";
  editorial_status: "auto_published" | "pending_review";
  verification_status: "pending";
  review_reason: string | null;
};

function publicationDecision(
  category: CategoryKey,
  title: string,
  content: string,
): PublicationDecision {
  const text = `${title} ${content}`.toLowerCase();

  const criticalTerms = [
    "ধর্ষণ",
    "যৌন নির্যাতন",
    "শিশু নির্যাতন",
    "শিশুকে হত্যা",
    "আত্মহত্যা",
    "সাম্প্রদায়িক",
    "সাম্প্রদায়িক",
    "গণহত্যা",
    "যুদ্ধাপরাধ",
  ];

  const highTerms = [
    "হত্যা",
    "নিহত",
    "মৃত",
    "মৃত্যু",
    "যুদ্ধ",
    "হামলা",
    "বিস্ফোরণ",
    "বোমা",
    "ককটেল",
    "গ্রেপ্তার",
    "আদালত",
    "রায়",
    "রায়",
    "জামিন",
    "নির্বাচন",
    "ভোট",
    "মহামারি",
    "হাম",
    "স্বাস্থ্য",
    "আক্রান্ত",
    "ব্যাংক",
    "মুদ্রা",
    "নিষেধাজ্ঞা",
  ];

  const highRiskCategories: CategoryKey[] = [
    "politics",
    "health",
    "economy",
    "international",
  ];

  if (criticalTerms.some((term) => text.includes(term))) {
    return {
      risk_level: "critical",
      status: "pending",
      editorial_status: "pending_review",
      verification_status: "pending",
      review_reason: "Critical/sensitive subject requires senior human editorial review",
    };
  }

  if (
    highRiskCategories.includes(category) ||
    highTerms.some((term) => text.includes(term))
  ) {
    return {
      risk_level: "high",
      status: "pending",
      editorial_status: "pending_review",
      verification_status: "pending",
      review_reason: "High-impact subject requires human editorial review",
    };
  }

  return {
    risk_level: "low",
    status: "published",
    editorial_status: "auto_published",
    verification_status: "pending",
    review_reason: null,
  };
}

Deno.test("sexual violence is critical and pending", () => {
  const result = publicationDecision(
    "national",
    "শিশুশিক্ষার্থীকে ধর্ষণ ও হত্যার পর তদন্ত",
    "ঘটনার তদন্ত চলছে",
  );

  assertEquals(result.risk_level, "critical");
  assertEquals(result.status, "pending");
  assertEquals(result.editorial_status, "pending_review");
});

Deno.test("war is high and pending", () => {
  const result = publicationDecision(
    "international",
    "ইরান যুদ্ধ বন্ধের শর্ত জানাল",
    "আলোচনা চলছে",
  );

  assertEquals(result.risk_level, "high");
  assertEquals(result.status, "pending");
  assertEquals(result.editorial_status, "pending_review");
});

Deno.test("official event schedule remains low and publishable", () => {
  const result = publicationDecision(
    "city",
    "ঢাকায় আগামীকাল বইমেলা শুরু হবে",
    "আয়োজকেরা সময়সূচি প্রকাশ করেছেন",
  );

  assertEquals(result.risk_level, "low");
  assertEquals(result.status, "published");
  assertEquals(result.editorial_status, "auto_published");
});
