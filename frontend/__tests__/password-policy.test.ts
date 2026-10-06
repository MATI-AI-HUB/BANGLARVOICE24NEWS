import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  passwordPolicyFailure,
} from '../lib/password-policy';

describe('passwordPolicyFailure', () => {
  it('requires twelve characters', () => {
    expect(passwordPolicyFailure('Aa1!short')).toBe('too_short');
  });

  it('requires a letter, number, and symbol', () => {
    expect(passwordPolicyFailure('abcdefghijkl')).toBe('missing_number');
    expect(passwordPolicyFailure('abcdefghijkl1')).toBe('missing_symbol');
    expect(passwordPolicyFailure('123456789012')).toBe('missing_letter');
  });

  it('accepts a strong-format password', () => {
    expect(passwordPolicyFailure('BanglarVoice12!')).toBeNull();
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });
});
