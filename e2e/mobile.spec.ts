import { expect, test, type Page } from "@playwright/test";

// Phone and tablet layout checks across the four widths the audit uses.
const viewports = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
];
const routes = [
  "/", "/family", "/family/card", "/family/watch", "/share", "/digest", "/shield",
  "/radar", "/whatsapp", "/ussd", "/about", "/privacy", "/disclaimer",
];

async function noSidewaysScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(extra).toBeLessThanOrEqual(1);
}

async function atLeastTap(page: Page, selector: string) {
  const boxes = await page.locator(selector).evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: (el.textContent || el.getAttribute("aria-label") || "").trim(), w: r.width, h: r.height };
      }),
  );
  expect(boxes.length, `${selector} is on the page`).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.h, `${box.text} height`).toBeGreaterThanOrEqual(44);
    expect(box.w, `${box.text} width`).toBeGreaterThanOrEqual(44);
  }
}

for (const viewport of viewports) {
  test.describe(`mobile ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true });

    test("no route scrolls sideways, light and dark", async ({ page }) => {
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const route of routes) {
          await page.goto(route);
          await noSidewaysScroll(page);
        }
      }
    });

    test("header, language switch and footer links are thumb-sized", async ({ page }) => {
      await page.goto("/");
      await atLeastTap(page, "header .theme-toggle");
      await atLeastTap(page, ".seg button");
      await atLeastTap(page, ".footer-links a");
    });
  });
}

test.describe("phone flows", () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  test("the paste box uses 16px text so iOS does not zoom", async ({ page }) => {
    await page.goto("/");
    const size = await page.getByLabel("Paste the message").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  });

  test("example chips stay on one line and scroll sideways inside their row", async ({ page }) => {
    await page.goto("/");
    const chips = page.locator(".scroll-x > .chip");
    if ((await chips.count()) === 0) test.skip(true, "no example row on this build");
    const heights = await chips.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
    await noSidewaysScroll(page);
  });

  test("a scam example gives a verdict on a small phone", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Sent by mistake" }).click();
    await expect(page.getByRole("heading", { name: "Scam" })).toBeVisible();
    await noSidewaysScroll(page);
  });

  test("theme toggle flips the page between light and dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.locator("header .theme-toggle").click();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .not.toBe(before);
  });
});
