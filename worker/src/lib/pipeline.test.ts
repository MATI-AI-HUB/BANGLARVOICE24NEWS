import { describe, expect, it } from "vitest";
import { contentHash, isStale, HEALTH_STALE_HOURS } from "./pipeline.js";

describe("pipeline helpers", () => {
  it("hashes source url + title + body stably", () => {
    const a = contentHash("https://ex.com/a", "শিরোনাম", "বিবরণ");
    const b = contentHash("https://ex.com/a", "শিরোনাম", "বিবরণ");
    const c = contentHash("https://ex.com/b", "শিরোনাম", "বিবরণ");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("treats missing timestamps as stale", () => {
    expect(isStale(null)).toBe(true);
    expect(isStale("not-a-date")).toBe(true);
  });

  it("uses the 6 hour health threshold", () => {
    expect(HEALTH_STALE_HOURS).toBe(6);
    const fresh = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const old = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
    expect(isStale(fresh)).toBe(false);
    expect(isStale(old)).toBe(true);
  });
});
