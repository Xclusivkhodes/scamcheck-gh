import { expect, test } from "@playwright/test";

test("sample check reaches a verdict in demo mode", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Check it first/ })).toBeVisible();
  await page.getByRole("button", { name: "Sent by mistake" }).click();
  await expect(page.getByRole("heading", { name: "Scam" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What to do now" })).toBeVisible();
  await expect(page.getByRole("link", { name: /100/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a short message stays on the form", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste the message").fill("hi");
  await page.getByRole("button", { name: "Check message" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Paste the whole message" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Check it first/ })).toBeVisible();
});

test("a vague message stays unsure", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste the message").fill("Hello, can we meet at the station after work today please?");
  await page.getByRole("button", { name: "Check message" }).click();
  await expect(page.getByRole("heading", { name: "Can't tell" })).toBeVisible();
});

test("theme follows the system until someone chooses", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(12, 12, 14)");
  await page.getByRole("button", { name: /Switch/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(250, 250, 250)");
});

test("missing page offers a way back", async ({ page }) => {
  const response = await page.goto("/this-page-is-missing");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page is not here" })).toBeVisible();
  await page.getByRole("link", { name: "Check a message" }).click();
  await expect(page.getByRole("heading", { name: /Check it first/ })).toBeVisible();
});
