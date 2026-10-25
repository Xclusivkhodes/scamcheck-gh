import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", name: /Check it first/ },
  { path: "/about", name: "How ScamCheck GH works" },
  { path: "/privacy", name: "Your message is not saved to disk" },
  { path: "/disclaimer", name: "Advice, not a guarantee" },
  { path: "/radar", name: "What people are checking" },
  { path: "/family", name: "Send a card, not the message" },
  { path: "/whatsapp", name: "WhatsApp bot" },
  { path: "/shield", name: "Checks on this phone" },
  { path: "/digest", name: "Three scams to watch" },
  { path: "/ussd", name: "USSD is not a public short code yet" },
];

for (const item of pages) {
  test(`${item.path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(item.path);
    await expect(page.getByRole("heading", { name: item.name })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test("a shared message is filled in and not checked until you ask", async ({ page }) => {
  await page.goto("/share?text=Please%20reverse%20GHS%20800%20with%20your%20PIN");
  await expect(page.getByRole("status")).toContainText("shared into ScamCheck");
  await expect(page.getByLabel("Paste the message")).toHaveValue("Please reverse GHS 800 with your PIN");
  await expect(page.getByRole("heading", { name: "Scam" })).toHaveCount(0);
});

test("radar offers CSA and MTN without inventing a short code", async ({ page }) => {
  await page.goto("/radar");
  await expect(page.getByRole("link", { name: "Call CSA 292" })).toHaveAttribute("href", /tel:/);
  await expect(page.getByRole("link", { name: "MTN *170#" })).toBeVisible();
});

test("family card leaves out the full message", async ({ page }) => {
  await page.goto("/family/card?verdict=scam&headline=Do%20not%20send%20it%20back&pattern=Fake%20wrong%20transfer");
  await expect(page.getByRole("heading", { name: "Scam" })).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: "Do not send it back" })).toBeVisible();
  await expect(page.getByRole("paragraph").filter({ hasText: /full message is not on this card/i })).toBeVisible();
});

test("digest quiz can be finished", async ({ page }) => {
  await page.goto("/digest");
  await page.getByRole("button", { name: "Do not send. Dial *170# yourself" }).click();
  await page.getByRole("button", { name: "A prize scam" }).click();
  await page.getByRole("button", { name: "No. Use a GRA office or gra.gov.gh" }).click();
  await page.getByRole("button", { name: "Check my answers" }).click();
  await expect(page.getByRole("status")).toContainText("Streak on this phone: 1");
});

test("shield starts empty", async ({ page }) => {
  await page.goto("/shield");
  await expect(page.getByText("No checks yet")).toBeVisible();
});
