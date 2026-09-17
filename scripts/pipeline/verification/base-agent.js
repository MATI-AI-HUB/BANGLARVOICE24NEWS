/**
 * base-agent.js — Uses multi-provider manager
 */
const manager = require('./providers/manager');

class BaseAgent {
  constructor(name, options = {}) {
    this.name = name;
    this.preferredProvider = options.provider || null;
    this.modelByProvider = options.modelByProvider || {};
    this.weight = options.weight || 1.0;
    this.isCritical = ['legal', 'bias', 'fact_checker'].includes(name);
  }

  async verify(content) {
    throw new Error('verify() must be implemented by subclass');
  }

  async ask(systemPrompt, userPrompt, options = {}) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // Custom provider preferences per agent
    const model_by_provider = { ...this.modelByProvider, ...(options.model_by_provider || {}) };

    // Prefer specific provider if defined (skip racing to that provider)
    if (this.preferredProvider && options.strategy !== 'race') {
      return manager.ask(messages, {
        ...options,
        strategy: 'fallback',
        model_by_provider: {
          [this.preferredProvider]: this.modelByProvider[this.preferredProvider],
          ...model_by_provider,
        },
      });
    }

    return manager.ask(messages, {
      json: true,
      temperature: 0.2,
      max_tokens: 1500,
      model_by_provider,
      ...options,
    });
  }

  parseJSON(raw) {
    if (typeof raw !== 'string') return raw;
    try {
      let s = raw.trim();
      if (s.startsWith('```')) s = s.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(s);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch {} }
      return null;
    }
  }

  verdictFromScore(score) {
    if (score >= 90) return 'pass';
    if (score >= 50) return 'warn';
    return 'fail';
  }

  async run(content) {
    const start = Date.now();
    try {
      const result = await this.verify(content);
      return {
        agent_name: this.name,
        model: result.model_used || this.preferredProvider || 'auto',
        weight: this.weight,
        is_critical: this.isCritical,
        passed: result.passed ?? (result.score >= 70),
        score: result.score ?? 70,
        confidence: result.confidence ?? 0.7,
        verdict: result.verdict || this.verdictFromScore(result.score ?? 70),
        reasoning: result.reasoning || '',
        evidence: result.evidence || {},
        flagged_items: result.flagged_items || [],
        suggestions: result.suggestions || [],
        duration_ms: Date.now() - start,
      };
    } catch (e) {
      return {
        agent_name: this.name,
        model: this.preferredProvider || 'auto',
        weight: this.weight,
        is_critical: this.isCritical,
        passed: false,
        score: 0,
        confidence: 0,
        verdict: 'error',
        reasoning: `Agent failed: ${e.message}`,
        evidence: {},
        flagged_items: [{ error: e.message }],
        suggestions: [],
        duration_ms: Date.now() - start,
      };
    }
  }
}

module.exports = { BaseAgent };
