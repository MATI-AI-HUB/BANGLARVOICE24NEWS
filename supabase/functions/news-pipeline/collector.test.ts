import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return value.trim();
  }
}

function cleanHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.test("normalizes tracking URL parameters", () => {
  const result = normalizeUrl(
    "https://example.com/news?id=7&utm_source=rss&fbclid=abc#top",
  );

  assertEquals(result, "https://example.com/news?id=7");
});

Deno.test("preserves valid non-tracking query parameters", () => {
  const result = normalizeUrl(
    "https://example.com/news?id=7&page=2&utm_medium=rss",
  );

  assertStringIncludes(result, "id=7");
  assertStringIncludes(result, "page=2");
  assertEquals(result.includes("utm_medium"), false);
});

Deno.test("removes HTML and normalizes whitespace", () => {
  assertEquals(
    cleanHtml("<p>বাংলার <strong>ভয়েস</strong>   সংবাদ</p>"),
    "বাংলার ভয়েস সংবাদ",
  );
});
