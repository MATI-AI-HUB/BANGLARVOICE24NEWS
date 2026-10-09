import { describe, expect, it } from "vitest";
import {
  MIN_BODY_CHARS,
  longestIdenticalRun,
  ngramOverlap,
  originalityHoldReason,
  parseSensitivityJson,
} from "./publish-gate.js";

const SOURCE =
  "ঢাকায় আজ সকালে হালকা বৃষ্টি হয়েছে এবং যানচলাচল স্বাভাবিক ছিল। আবহাওয়া অধিদপ্তর বিকেলে মেঘলা আকাশের কথা বলেছে।";

describe("originality and sensitivity helpers", () => {
  it("exports MIN_BODY_CHARS = 200", () => {
    expect(MIN_BODY_CHARS).toBe(200);
  });

  it("holds when 4-gram overlap exceeds 20%", () => {
    // Insert filler every 6 words → max identical run = 6, but most 4-grams remain
    const words = SOURCE.split(/\s+/);
    const out: string[] = [];
    for (let i = 0; i < words.length; i++) {
      out.push(words[i]);
      if ((i + 1) % 6 === 0) out.push("এবং");
    }
    const paraphrased = out.join(" ");
    expect(ngramOverlap(paraphrased, SOURCE)).toBeGreaterThan(0.2);
    expect(longestIdenticalRun(paraphrased, SOURCE)).toBeLessThan(8);
    expect(originalityHoldReason(paraphrased, SOURCE)).toBe("ngram_overlap");
  });

  it("holds an 8+ identical consecutive word run", () => {
    const run = "আজ সকালে হালকা বৃষ্টি হয়েছে এবং যানচলাচল স্বাভাবিক ছিল অতিরিক্ত বাক্য এখানে আছে";
    expect(longestIdenticalRun(run, SOURCE)).toBeGreaterThanOrEqual(8);
    expect(originalityHoldReason(run, SOURCE)).toBe("identical_run");
  });

  it("holds numbers and years that are absent from the source", () => {
    expect(originalityHoldReason("বৃষ্টিতে 2024 সালে 12 মিলিমিটার জমা হয়", SOURCE)).toBe(
      "number_not_in_source",
    );
  });

  it("holds when source text is missing", () => {
    expect(originalityHoldReason("কোনো লেখা", "")).toBe("source_text_missing");
  });

  it("parses sensitivity JSON and rejects invalid payloads", () => {
    const ok = parseSensitivityJson('{"sensitive":true,"reasons":["violence"]}');
    expect(ok).toEqual({ sensitive: true, reasons: ["violence"] });
    expect(parseSensitivityJson("not json")).toBeNull();
    expect(parseSensitivityJson("{}")).toBeNull();
  });
});
