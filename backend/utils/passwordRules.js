export function validatePassword(password) {
  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const passed = Object.values(rules).every(Boolean);

  return {
    passed,
    errors: Object.entries(rules)
      .filter(([_, pass]) => !pass)
      .map(([rule]) => rule),
  };
}
