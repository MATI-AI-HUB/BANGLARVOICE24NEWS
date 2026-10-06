export const PASSWORD_MIN_LENGTH = 12;

export type PasswordPolicyFailure =
  | 'too_short'
  | 'missing_letter'
  | 'missing_number'
  | 'missing_symbol';

export function passwordPolicyFailure(password: string): PasswordPolicyFailure | null {
  if (password.length < PASSWORD_MIN_LENGTH) return 'too_short';
  if (!/[A-Za-z]/.test(password)) return 'missing_letter';
  if (!/[0-9]/.test(password)) return 'missing_number';
  if (!/[^A-Za-z0-9\s]/.test(password)) return 'missing_symbol';
  return null;
}
