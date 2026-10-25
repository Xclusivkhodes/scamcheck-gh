/** Wrap the phrases that drove the pre-check. Longest match wins. */
export function highlightSpans(text: string, needles: string[]): Array<{ text: string; hit: boolean }> {
  const unique = [...new Set(needles.map((needle) => needle.trim()).filter((needle) => needle.length >= 3))];
  if (!text || unique.length === 0) return [{ text, hit: false }];
  const pattern = unique
    .sort((a, b) => b.length - a.length)
    .map((needle) => needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const parts: Array<{ text: string; hit: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(pattern, "gi"))) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index), hit: false });
    parts.push({ text: match[0], hit: true });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts.length > 0 ? parts : [{ text, hit: false }];
}

export function highlightNeedles(text: string, extras: string[] = []): string[] {
  const found = [...extras];
  const rules = [
    /\*[0-9*]+#/g,
    /\b(?:pin|otp|password|ghana card)\b/gi,
    /\b(?:reverse|reversal|sent by mistake)\b/gi,
    /\b(?:you have won|activation fee|claim)\b/gi,
    /https?:\/\/[^\s]+/gi,
  ];
  for (const rule of rules) {
    for (const match of text.matchAll(rule)) found.push(match[0]);
  }
  return found;
}
