import { IMAGE_CHAR_LIMIT } from "./limits";
import { CheckError } from "./errors";

export function assertSafeImage(dataUrl: string): void {
  const match = /^data:image\/(png|jpe?g|webp|gif);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) throw new CheckError(400, "Use a JPG, PNG, or WEBP photo.");
  const payload = match[2].replace(/\s/g, "");
  if (payload.length > IMAGE_CHAR_LIMIT) {
    throw new CheckError(400, "That photo is too large. Crop it and try again.");
  }
  const bytes = Buffer.from(payload.slice(0, 32), "base64");
  if (!magicOk(match[1].toLowerCase(), bytes)) {
    throw new CheckError(400, "Use a JPG, PNG, or WEBP photo.");
  }
}

function magicOk(kind: string, bytes: Buffer): boolean {
  if (kind === "png") return bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (kind === "jpg" || kind === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (kind === "gif") return bytes.subarray(0, 3).equals(Buffer.from("GIF"));
  if (kind === "webp") {
    return bytes.subarray(0, 4).equals(Buffer.from("RIFF")) && bytes.subarray(8, 12).equals(Buffer.from("WEBP"));
  }
  return false;
}
