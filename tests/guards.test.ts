import { describe, expect, it } from "vitest";
import { buildActions, OFFICIAL_CONTACTS } from "../lib/official";
import { settleVerdict } from "../lib/finalize";
import { messageTooShort, photoIsBlurry, prescanMessage, shouldWarnSlow } from "../lib/prescan";
import type { Entities } from "../lib/types";

const empty: Entities = { phones: [], names: [], amounts: [], links: [], organisations: [] };

describe("official contacts", () => {
  it("uses the checked list and never a model-supplied number", () => {
    const actions = buildActions(
      "scam",
      "fake_reversal",
      { ...empty, organisations: ["MTN MoMo"] },
      "en",
      "MTN MoMo reversal",
    );
    const hrefs = actions.map((action) => action.href).filter(Boolean);
    expect(hrefs).toContain(OFFICIAL_CONTACTS.mtnUssdHref);
    expect(hrefs).toContain(OFFICIAL_CONTACTS.mtnCareHref);
    expect(hrefs).toContain(OFFICIAL_CONTACTS.csaHref);
    expect(hrefs).toContain("tel:191");
    expect(hrefs).toContain("tel:18555");
    expect(hrefs).not.toContain("tel:419");
    expect(JSON.stringify(actions)).not.toContain("0593974486");
    expect(actions.some((action) => action.dial?.includes("*170# › 6 › 4"))).toBe(true);
  });

  it("keeps AT Money as a placeholder with no number", () => {
    const actions = buildActions("scam", "payment_request", empty, "en", "Send AT Money to this new wallet");
    const at = actions.find((action) => action.dial === "AT Money");
    expect(at?.placeholder).toBe(true);
    expect(at?.href).toBeUndefined();
  });

  it("does not invent a Telecel number", () => {
    const actions = buildActions("suspicious", "payment_request", empty, "en", "Telecel Cash says pay now");
    expect(actions.some((action) => action.dial === "Telecel Cash" && action.placeholder)).toBe(true);
    expect(actions.some((action) => /050\s*555/.test(action.dial ?? "") || /050\s*555/.test(action.sub ?? ""))).toBe(false);
    expect(actions.some((action) => action.href === "tel:292")).toBe(true);
  });
});

describe("verdict guard", () => {
  it("never calls a low-confidence message Looks OK", () => {
    expect(settleVerdict("looks_ok", 58)).toBe("unsure");
    expect(settleVerdict("scam", 40)).toBe("unsure");
    expect(settleVerdict("looks_ok", 86)).toBe("looks_ok");
    expect(settleVerdict("scam", 96)).toBe("scam");
  });
});

describe("input states", () => {
  it("flags a short message, a blurry photo, a slow gap, and pre-scan chips", () => {
    expect(messageTooShort("Hi")).toBe(true);
    expect(messageTooShort("Please send the money back today")).toBe(false);
    expect(photoIsBlurry(20, 20, 100)).toBe(true);
    expect(photoIsBlurry(800, 600, 80_000)).toBe(false);
    expect(shouldWarnSlow(8_000, true)).toBe(true);
    expect(shouldWarnSlow(7_999, true)).toBe(false);
    expect(shouldWarnSlow(9_000, false)).toBe(false);
    expect(prescanMessage("Send GHS 20 to 0244000000. My PIN is urgent.").map((chip) => chip.id)).toEqual([
      "amount",
      "phone",
      "pin",
      "urgent",
    ]);
  });
});
