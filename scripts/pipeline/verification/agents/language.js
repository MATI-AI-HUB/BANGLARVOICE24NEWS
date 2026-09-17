const { BaseAgent } = require('../base-agent');
class LanguageAgent extends BaseAgent {
  constructor() {
    super('language', { model: 'qwen/qwen3.8-27b', weight: 1.5 });
  }
  async verify({ article }) {
    const text = (article.content_bn || '').replace(/<[^>]*>/g, ' ').trim();
    const system = `তুমি পেশাদার বাংলা ভাষা সম্পাদক। বানান, ব্যাকরণ, বাংলা সংখ্যা (০-৯), তারিখ যাচাই করো।
JSON format (strict):
{
  "passed": boolean,
  "score": number (0-100),
  "confidence": number (0-1),
  "reasoning": "Bengali explanation",
  "spelling_issues": [{"word": "string", "suggestion": "string"}],
  "grammar_issues": [{"phrase": "string", "issue": "string"}],
  "numeral_issues": [{"found": "string", "should_be": "string"}],
  "flagged_items": [{"severity": "high|medium|low", "issue": "string"}],
  "suggestions": ["string"]
}`;
    const user = `শিরোনাম: ${article.title_bn}
বিষয়বস্তু: ${text.slice(0, 3000)}`;
    const { content } = await this.ask(system, user, { model_by_provider: { groq: 'qwen/qwen3.8-27b' } });
    const parsed = this.parseJSON(content);
    if (!parsed) return { passed: false, score: 40, confidence: 0.3, reasoning: 'AI parse failed' };
    return parsed;
  }
}
module.exports = { LanguageAgent };
