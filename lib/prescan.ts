export interface PrescanChip {
  id: string;
  label: string;
}

export function prescanMessage(text: string): PrescanChip[] {
  const chips: PrescanChip[] = [];
  if (/GHS|GH₵|GH¢|\bcedis\b/i.test(text)) chips.push({ id: "amount", label: "Money amount" });
  if (/(?:\+233|233|0)[\s-]?[235]\d{2}/.test(text)) chips.push({ id: "phone", label: "Phone number" });
  if (/https?:\/\/|www\./i.test(text)) chips.push({ id: "link", label: "Link" });
  if (/mistake|reverse|send it back/i.test(text)) chips.push({ id: "back", label: "“Send it back”" });
  if (/\bPIN\b|\bOTP\b/i.test(text)) chips.push({ id: "pin", label: "PIN or code" });
  if (/urgent|immediately|now now|as soon as/i.test(text)) chips.push({ id: "urgent", label: "Urgent" });
  return chips;
}

export function messageTooShort(text: string): boolean {
  return text.trim().length < 20;
}

/** A photo we cannot read: tiny dimensions, or a file too small to be a message. */
export function photoIsBlurry(width: number, height: number, byteLength: number): boolean {
  if (width > 0 && height > 0 && (width < 64 || height < 64)) return true;
  if (byteLength > 0 && byteLength < 2_500) return true;
  return false;
}

export function shouldWarnSlow(msSinceLastEvent: number, inFlight: boolean): boolean {
  return inFlight && msSinceLastEvent >= 8_000;
}
