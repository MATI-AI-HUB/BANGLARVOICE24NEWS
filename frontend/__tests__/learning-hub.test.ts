import { describe, it, expect } from 'vitest';
import { answer } from '../components/learning-hub';

describe('learning-hub answer engine', () => {
  it('answers standard greetings without returning the unknown-question fallback', () => {
    expect(answer('Hi')).toContain('ওয়ালাইকুম আসসালাম');
    expect(answer('Hello!')).toContain('AI সহকারী');
    expect(answer('সালাম')).toContain('সর্বশেষ সংবাদ');
  });

  it('answers about the organization', () => {
    const a = answer('বাংলার ভয়েস কী?');
    expect(a).toContain('বাংলার ভয়েস');
  });

  it('answers about fact-checking', () => {
    const a = answer('সংবাদ কীভাবে যাচাই করা হয়?');
    expect(a).toContain('ai_score');
  });

  it('answers about the AI anchor', () => {
    const a = answer('AI অ্যাংকর কী?');
    expect(a).toContain('AI নিউজ অ্যাংকর');
  });

  it('answers about e-paper', () => {
    const a = answer('ই-পেপার কোথায় পাবো?');
    expect(a).toContain('ই-পেপার');
  });

  it('falls back to a default for unknown questions', () => {
    const a = answer('জ্যোতির্বিজ্ঞান সম্পর্কে বলো');
    expect(a).toContain('দুঃখিত');
  });
});
