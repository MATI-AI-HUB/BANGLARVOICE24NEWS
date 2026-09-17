const { BaseAgent } = require('../base-agent');
class ImageAgent extends BaseAgent {
  constructor() {
    super('image', { model: 'openai/gpt-oss-120b', weight: 1.5 });
  }
  async verify({ article, images = [] }) {
    if (!images.length && !article.thumbnail_url) {
      return { passed: false, score: 30, confidence: 0.9, reasoning: 'কোনো ছবি নেই', flagged_items: [{ severity: 'high', issue: 'no_image' }] };
    }
    const list = images.map((img, i) => `Image ${i+1}: ${img.url || img.path || 'unknown'}`).join('\n');
    const text = (article.content_bn || '').replace(/<[^>]*>/g, ' ').trim();
    const system = `তুমি ছবি যাচাই বিশেষজ্ঞ। সংবাদের সাথে ছবির প্রাসঙ্গিকতা যাচাই করো।
JSON format (strict):
{
  "passed": boolean,
  "score": number (0-100),
  "confidence": number (0-1),
  "reasoning": "Bengali explanation",
  "relevance_scores": [{"index": number, "score": number}],
  "flagged_items": [{"severity": "high|medium|low", "issue": "string"}],
  "suggestions": ["string"]
}`;
    const user = `শিরোনাম: ${article.title_bn}
বিভাগ: ${article.category_key}
বিষয়বস্তু: ${text.slice(0, 500)}
ছবি: ${list}
Thumbnail: ${article.thumbnail_url || 'none'}`;
    const { content } = await this.ask(system, user, { model_by_provider: { groq: 'groq/compound-mini' } });
    const parsed = this.parseJSON(content);
    if (!parsed) return { passed: false, score: 40, confidence: 0.3, reasoning: 'AI parse failed' };
    return parsed;
  }
}
module.exports = { ImageAgent };
