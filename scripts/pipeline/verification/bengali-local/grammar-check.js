/**
 * bengali-local/grammar-check.js
 * Local Bengali grammar rules — no API cost
 * Catches: numerals, dates, common misspellings
 */
const BN_NUMERALS = /[0-9]/g;
const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

// Common Bengali mistakes
const COMMON_MISTAKES = {
  'কিচ্ছু': 'কিছু',
  'বেশী': 'বেশি',
  'নাতি': 'নাতনি',
  'পড়া': 'পড়া',
  'ইতিমধ্যে': 'ইতোমধ্যে',
  'উপরোক্ত': 'উপর্যুক্ত',
  'একত্রিত': 'একত্র',
  'সর্বস্বত্ব': 'সর্বস্বত্ব',
  'প্রফেসর': 'অধ্যাপক',
};

function checkNumerals(text) {
  const matches = text.match(/[0-9]+/g) || [];
  return matches.map(m => ({
    found: m,
    should_be: m.replace(/[0-9]/g, d => BN_DIGITS[+d]),
    context: text.slice(Math.max(0, text.indexOf(m) - 20), text.indexOf(m) + 20),
  }));
}

function checkCommonMistakes(text) {
  const issues = [];
  for (const [wrong, right] of Object.entries(COMMON_MISTAKES)) {
    if (text.includes(wrong)) {
      issues.push({ word: wrong, suggestion: right });
    }
  }
  return issues;
}

function checkDateFormat(text) {
  const issues = [];
  // English months in Bengali text
  const engMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  for (const m of engMonths) {
    if (text.includes(m)) {
      issues.push({ found: m, issue: 'English month in Bengali article' });
    }
  }
  return issues;
}

function analyze(article) {
  const text = (article.title_bn || '') + '\n' + (article.content_bn || '').replace(/<[^>]*>/g, ' ');
  const numeral_issues = checkNumerals(text);
  const spelling_issues = checkCommonMistakes(text);
  const date_issues = checkDateFormat(text);

  const totalIssues = numeral_issues.length + spelling_issues.length + date_issues.length;
  const score = Math.max(0, 100 - totalIssues * 3);

  return {
    passed: score >= 80,
    score,
    confidence: 0.95, // high confidence — deterministic
    reasoning: totalIssues === 0
      ? 'কোনো স্পষ্ট ভাষা সমস্যা পাওয়া যায়নি'
      : totalIssues + 'টি সম্ভাব্য সমস্যা পাওয়া গেছে',
    numeral_issues,
    spelling_issues,
    date_issues,
    flagged_items: [
      ...numeral_issues.map(i => ({ severity: 'medium', issue: `English numeral "${i.found}"` })),
      ...spelling_issues.map(i => ({ severity: 'low', issue: `"${i.word}" → "${i.suggestion}"` })),
    ],
  };
}

module.exports = { analyze };

// CLI test
if (require.main === module) {
  const test = {
    title_bn: 'বাংলাদেশে 2026 সালে নতুন প্রকল্প',
    content_bn: 'সরকার ৫০০ কোটি টাকা বরাদ্দ করেছে। January মাসে শুরু হবে। কিছু বিষয় ইতিমধ্যে ঠিক করা হয়েছে।',
  };
  console.log(JSON.stringify(analyze(test), null, 2));
}
