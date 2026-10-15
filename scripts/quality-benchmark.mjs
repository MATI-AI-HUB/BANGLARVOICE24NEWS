#!/usr/bin/env node
/**
 * Deterministic article-quality benchmark.
 *
 * This intentionally uses only redacted fixtures and pure checks so it can run
 * in CI without provider credentials, changing production data, or making
 * model-quality claims that are not reproducible.
 */
const dimensions = ['bengali', 'numbersPreserved', 'relevant', 'structured', 'entitiesPreserved', 'spellingPreserved'];
const fixtures = [
  {
    id: 'bn-valid-01',
    source: 'ঢাকায় আজ ২৫ মিলিমিটার বৃষ্টিপাত হয়েছে বলে আবহাওয়া অধিদপ্তর জানিয়েছে।',
    output: 'আবহাওয়া অধিদপ্তর জানিয়েছে, ঢাকায় আজ ২৫ মিলিমিটার বৃষ্টিপাত হয়েছে।',
    title: 'ঢাকায় আজ ২৫ মিলিমিটার বৃষ্টিপাত',
    structured: '{"headline":"ঢাকায় বৃষ্টিপাত","entities":["ঢাকা"],"numbers":[25]}',
    entities: ['ঢাকা'],
    spelling: ['আবহাওয়া', 'অধিদপ্তর'],
    expected: { bengali: true, numbersPreserved: true, relevant: true, structured: true, entitiesPreserved: true, spellingPreserved: true },
  },
  {
    id: 'bn-number-drift',
    source: 'চট্টগ্রামে ১২টি আশ্রয়কেন্দ্র খোলা হয়েছে।',
    output: 'চট্টগ্রামে ২১টি আশ্রয়কেন্দ্র খোলা হয়েছে।',
    title: 'চট্টগ্রামে আশ্রয়কেন্দ্র খোলা',
    structured: '{"headline":"চট্টগ্রামে আশ্রয়কেন্দ্র","entities":["চট্টগ্রাম"],"numbers":[21]}',
    entities: ['চট্টগ্রাম'],
    spelling: ['আশ্রয়কেন্দ্র'],
    expected: { bengali: true, numbersPreserved: false, relevant: true, structured: true, entitiesPreserved: true, spellingPreserved: true },
  },
  {
    id: 'bn-unrelated',
    source: 'রাজশাহীতে নদীর পানি কমেছে।',
    output: 'ঢাকায় নতুন সেতু নির্মাণের ঘোষণা দেওয়া হয়েছে।',
    title: 'ঢাকায় নতুন সেতু',
    structured: '{"headline":"ঢাকায় সেতু","entities":["ঢাকা"],"numbers":[]}',
    entities: ['রাজশাহী'],
    spelling: ['নদীর', 'পানি'],
    expected: { bengali: true, numbersPreserved: true, relevant: false, structured: true, entitiesPreserved: false, spellingPreserved: false },
  },
  {
    id: 'invalid-structured',
    source: 'সিলেটে বিদ্যুৎ সরবরাহ স্বাভাবিক হয়েছে।',
    output: 'সিলেটে বিদ্যুৎ সরবরাহ স্বাভাবিক হয়েছে।',
    title: 'সিলেটে বিদ্যুৎ সরবরাহ স্বাভাবিক',
    structured: '{headline:',
    entities: ['সিলেট'],
    spelling: ['বিদ্যুৎ', 'সরবরাহ'],
    expected: { bengali: true, numbersPreserved: true, relevant: true, structured: false, entitiesPreserved: false, spellingPreserved: true },
  },
  {
    id: 'bn-entity-preservation',
    source: 'কক্সবাজারে নতুন আশ্রয়কেন্দ্র প্রস্তুত রাখা হয়েছে।',
    output: 'কক্সবাজারে নতুন আশ্রয়কেন্দ্র প্রস্তুত রাখা হয়েছে।',
    title: 'কক্সবাজারে আশ্রয়কেন্দ্র প্রস্তুত',
    structured: '{"headline":"কক্সবাজারে আশ্রয়কেন্দ্র","entities":["কক্সবাজার"],"numbers":[]}',
    entities: ['কক্সবাজার'],
    spelling: ['আশ্রয়কেন্দ্র', 'প্রস্তুত'],
    expected: { bengali: true, numbersPreserved: true, relevant: true, structured: true, entitiesPreserved: true, spellingPreserved: true },
  },
  {
    id: 'bn-spelling-preservation',
    source: 'সুন্দরবনে বাঘের বিচরণ বেড়েছে বলে বন বিভাগ জানিয়েছে।',
    output: 'বন বিভাগ জানিয়েছে, সুন্দরবনে বাঘের বিচরণ বেড়েছে।',
    title: 'সুন্দরবনে বাঘের বিচরণ বেড়েছে',
    structured: '{"headline":"সুন্দরবনে বাঘের বিচরণ","entities":["সুন্দরবন"],"numbers":[]}',
    entities: ['সুন্দরবন'],
    spelling: ['সুন্দরবনে', 'বিচরণ', 'বন বিভাগ'],
    expected: { bengali: true, numbersPreserved: true, relevant: true, structured: true, entitiesPreserved: true, spellingPreserved: true },
  },
];

const digits = '০১২৩৪৫৬৭৮৯';
const normalize = (text) => text.normalize('NFC').replace(/[০-৯]/g, (d) => String(digits.indexOf(d))).replace(/[,.]/g, '');
const numbers = (text) => [...new Set(normalize(text).match(/\d+/g) || [])].sort();
const bengaliRatio = (text) => {
  const chars = [...text].filter((c) => !/\s/u.test(c));
  return chars.length ? chars.filter((c) => { const n = c.codePointAt(0) || 0; return n >= 0x0980 && n <= 0x09ff; }).length / chars.length : 0;
};
const structuredValue = (text) => {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && typeof value.headline === 'string' && Array.isArray(value.entities) && Array.isArray(value.numbers) ? value : null;
  } catch {
    return null;
  }
};
const structuredValid = (text) => Boolean(structuredValue(text));
const relevant = (source, output) => {
  const sourceTokens = new Set(source.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/u).filter((t) => t.length > 2));
  const outputTokens = new Set(output.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/u).filter((t) => t.length > 2));
  let overlap = 0;
  for (const token of outputTokens) if (sourceTokens.has(token)) overlap += 1;
  return outputTokens.size > 0 && overlap / outputTokens.size >= 0.35;
};
const containsAll = (text, required) => required.every((token) => normalize(text).includes(normalize(token)));

const results = fixtures.map((f) => {
  const structured = structuredValue(f.structured);
  return {
    id: f.id,
    bengali: bengaliRatio(`${f.title} ${f.output}`) >= 0.3,
    numbersPreserved: JSON.stringify(numbers(f.output)) === JSON.stringify(numbers(f.source)),
    relevant: relevant(f.source, f.output),
    structured: Boolean(structured),
    entitiesPreserved: Boolean(structured) && f.entities.every((entity) => structured.entities.map(String).includes(entity)),
    spellingPreserved: containsAll(f.output, f.spelling),
    expected: f.expected,
  };
});
const metrics = Object.fromEntries(dimensions.map((key) => {
  const passed = results.filter((r) => r[key] === true).length;
  return [key, { passed, total: results.length, rate: passed / results.length }];
}));
const checked = results.map((r) => ({ ...r, fixture_pass: dimensions.every((key) => r[key] === r.expected[key]) }));
const report = { version: 2, generated_at: new Date().toISOString(), fixture_count: fixtures.length, dimensions, metrics, results: checked };
console.log(JSON.stringify(report, null, 2));
if (checked.some((r) => !r.fixture_pass)) process.exitCode = 1;
