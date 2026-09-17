const { BaseAgent } = require('../base-agent');
class FactCheckerAgent extends BaseAgent {
  constructor() {
    super('fact_checker', { model: 'openai/gpt-oss-120b', weight: 2.0 });
  }
  async verify({ article, relatedArticles = [] }) {
    const text = (article.content_bn || '').replace(/<[^>]*>/g, ' ').trim();
    const ctx = relatedArticles.slice(0, 5).map(a => `- ${a.title_bn}`).join('\n');
    const system = `তুমি পেশাদার সংবাদ ফ্যাক্ট-চেকার। সংবাদের claim যাচাই করো।
JSON format (strict):
{
  "passed": boolean,
  "score": number (0-100),
  "confidence": number (0-1),
  "reasoning": "Bengali explanation",
  "claims": [{"type": "name|date|place|number|quote", "value": "string", "verified": boolean}],
  "flagged_items": [{"severity": "high|medium|low", "issue": "string"}],
  "suggestions": ["string"]
}`;
    const user = `সংবাদ যাচাই:
শিরোনাম: ${article.title_bn}
বিভাগ: ${article.category_key}
বিষয়বস্তু: ${text.slice(0, 3000)}
${ctx ? '\nসংশ্লিষ্ট সংবাদ:\n' + ctx : ''}`;
    const { content } = await this.ask(system, user, { model_by_provider: { groq: 'openai/gpt-oss-20b' } });
    const parsed = this.parseJSON(content);
    if (!parsed) return { passed: false, score: 40, confidence: 0.3, reasoning: 'AI parse failed', flagged_items: [{ issue: 'parse_error' }] };
    return parsed;
  }
}
module.exports = { FactCheckerAgent };
