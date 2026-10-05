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
  it("exports MIN_BODY_CHARS = 600", () => {
    expect(MIN_BODY_CHARS).toBe(600);
  });

  it("holds when 4-gram overlap exceeds 20%", () => {
    // SOURCE duplicated has both high ngram and long identical run.
    // Since identical_run is more severe, it should be returned first.
    // Test ngramOverlap directly, and originality should be either.
    const copied = SOURCE + " " + SOURCE;
    expect(ngramOverlap(copied, SOURCE)).toBeGreaterThan(0.2);
    expect(["ngram_overlap", "identical_run"]).toContain(originalityHoldReason(copied, SOURCE));
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
  it("parses sensitivity JSON and rejects invalid payloads", () => {
    expect(parseSensitivityJson('{"sensitive":true,"reasons":["minors"]}')).toEqual({
      sensitive: true,
      reasons: ["minors"],
    });
    expect(parseSensitivityJson("not json")).toBeNull();
    expect(parseSensitivityJson('{"sensitive":"yes"}')).toBeNull();
  });
});
