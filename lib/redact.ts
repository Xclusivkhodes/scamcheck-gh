/**
 * Removes PIN, OTP, password, and Ghana Card values before a live prompt is built.
 * Phone numbers stay. They are the evidence a check is about, not the secret.
 */
export function redactSecrets(text: string): { text: string; redacted: number } {
  let redacted = 0;
  let next = text.replace(/\bGHA[-\s]?\d{9}[-\s]?\d\b/gi, () => {
    redacted += 1;
    return "[redacted Ghana Card]";
  });

  const labelled = /\b(pin|otp|password|passcode|cvv|verification code|one[- ]time code|(?:whatsapp|momo)\s+code)\b(\s*[:=]?\s*)(\d{4,8})\b/gi;
  next = next.replace(labelled, (match, label: string, mid: string, digits: string, offset: number) => {
    if (continuesAsLongerNumber(next, offset, match, digits)) return match;
    redacted += 1;
    return `${label}${mid}[redacted]`;
  });

  const nearby = /\b(pin|otp|password|passcode|cvv|verification code|one[- ]time code|(?:whatsapp|momo)\s+code)\b([^.\n]{0,32}?)(\b\d{4,8}\b)/gi;
  next = next.replace(nearby, (match, label: string, mid: string, digits: string, offset: number) => {
    if (mid.includes("[redacted]")) return match;
    if (continuesAsLongerNumber(next, offset, match, digits)) return match;
    redacted += 1;
    return `${label}${mid}[redacted]`;
  });

  return { text: next, redacted };
}

function continuesAsLongerNumber(text: string, offset: number, match: string, digits: string): boolean {
  const digitAt = offset + match.lastIndexOf(digits);
  const before = text[digitAt - 1] ?? "";
  const after = text[digitAt + digits.length] ?? "";
  return /\d/.test(before) || /\d/.test(after);
}
