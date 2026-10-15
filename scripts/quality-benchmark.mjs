#!/usr/bin/env node
/**
 * Deterministic article-quality benchmark.
 *
 * This intentionally uses only redacted fixtures and pure checks so it can run
 * in CI without provider credentials, changing production data, or making
 * model-quality claims that are not reproducible.
 */
const fixtures = [
  {
    id: 'bn-valid-01',
    source: 'ঢাকায় আজ ২৫ মিলিমিটার বৃষ্টিপাত হয়েছে বলে আবহাওয়া অধিদপ্তর জানিয়েছে।',
    output: 'আবহাওয়া অধিদপ্তর জানিয়েছে, ঢাকায় আজ ২৫ মিলিমিটার বৃষ্টিপাত হয়েছে।',
    title: 'ঢাকায় আজ ২৫ মিলিমিটার বৃষ্টিপাত',
    structured: '{"headline":"ঢাকায় বৃষ্টিপাত","entities":["ঢাকা"],"numbers":[25]}',
    expected: { bengali: true, numbersPreserved: true, relevant: true, structured: true },
  },
  {
    id: 'bn-number-drift',
    source: 'চট্টগ্রামে ১২টি আশ্রয়কেন্দ্র খোলা হয়েছে।',
    output: 'চট্টগ্রামে ২১টি আশ্রয়কেন্দ্র খোলা হয়েছে।',
    title: 'চট্টগ্রামে আশ্রয়কেন্দ্র খোলা',
    structured: '{"headline":"চট্টগ্রামে আশ্রয়কেন্দ্র","entities":["চট্টগ্রাম"],"numbers":[21]}',
    expected: { bengali: true, numbersPreserved: false, relevant: true, structured: true },
  },
  {
    id: 'bn-unrelated',
    source: 'রাজশাহীতে নদীর পানি কমেছে।',
    output: 'ঢাকায় নতুন সেতু নির্মাণের ঘোষণা দেওয়া হয়েছে।',
    title: 'ঢাকায় নতুন সেতু',
    structured: '{"headline":"ঢাকায় সেতু","entities":["ঢাকা"],"numbers":[]}',
    expected: { bengali: true, numbersPreserved: true, relevant: false, structured: true },
  },
  {
    id: 'invalid-structured',
    source: 'সিলেটে বিদ্যুৎ সরবরাহ স্বাভাবিক হয়েছে।',
    output: 'সিলেটে বিদ্যুৎ সরবরাহ স্বাভাবিক হয়েছে।',
    title: 'সিলেটে বিদ্যুৎ সরবরাহ স্বাভাবিক',
    structured: '{headline:',
    expected: { bengali: true, numbersPreserved: true, relevant: true, structured: false },
  },
];

const digits = '০১২৩৪৫৬৭৮৯';
const normalize = (text) => text.replace(/[০-৯]/g, (d) => String(digits.indexOf(d))).replace(/[,.]/g, '');
const numbers = (text) => [...new Set(normalize(text).match(/\d+/g) || [])];
const bengaliRatio = (text) => {
  const chars = [...text].filter((c) => !/\s/u.test(c));
  return chars.length ? chars.filter((c) => { const n = c.codePointAt(0) || 0; return n >= 0x0980 && n <= 0x09ff; }).length / chars.length : 0;
};
const structuredValid = (text) => { try { const value = JSON.parse(text); return Boolean(value && typeof value === 'object' && typeof value.headline === 'string' && Array.isArray(value.entities) && Array.isArray(value.numbers)); } catch { return false; } };
const relevant = (source, output) => {
  const sourceTokens = new Set(source.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/u).filter((t) => t.length > 2));
  const outputTokens = new Set(output.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/u).filter((t) => t.length > 2));
  let overlap = 0; for (const token of outputTokens) if (sourceTokens.has(token)) overlap += 1;
  return outputTokens.size > 0 && overlap / outputTokens.size >= 0.35;
};

const results = fixtures.map((f) => ({
  id: f.id,
  bengali: bengaliRatio(`${f.title} ${f.output}`) >= 0.3,
  numbersPreserved: numbers(f.output).every((n) => numbers(f.source).includes(n)),
  relevant: relevant(f.source, f.output),
  structured: structuredValid(f.structured),
  expected: f.expected,
}));
const metrics = Object.fromEntries(['bengali', 'numbersPreserved', 'relevant', 'structured'].map((key) => [key, { passed: results.filter((r) => r[key] === true).length, total: results.length, rate: results.filter((r) => r[key] === true).length / results.length }]));
const checked = results.map((r) => ({ ...r, fixture_pass: ['bengali', 'numbersPreserved', 'relevant', 'structured'].every((key) => r[key] === r.expected[key]) }));
const report = { version: 1, generated_at: new Date().toISOString(), fixture_count: fixtures.length, metrics, results: checked };
console.log(JSON.stringify(report, null, 2));
if (checked.some((r) => !r.fixture_pass)) process.exitCode = 1;
