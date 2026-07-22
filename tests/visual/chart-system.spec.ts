import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-760", width: 760, height: 900 },
  { name: "compact-1040", width: 1040, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 },
] as const;

for (const viewport of viewports) {
  test(`chart system ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lab/chart-system");
    await expect(page.getByRole("heading", { name: "Chart system verification" })).toBeVisible();
    await expect(page).toHaveScreenshot(`chart-system-${viewport.name}.png`, {
      fullPage: true,
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("chart inspection remains keyboard operable", async ({ page }) => {
  await page.setViewportSize({ width: 1040, height: 900 });
  await page.goto("/lab/chart-system");
  const chart = page.getByRole("group", { name: /HRV trend/i }).first();
  const restingChart = page.getByRole("group", { name: /Resting HR trend/i }).first();
  await chart.focus();
  await page.keyboard.press("Home");
  await expect(chart).toContainText(/Jul 15/i);
  await expect(restingChart).toContainText(/Jul 15/i);
  await page.keyboard.press("End");
  await expect(chart).toContainText(/Jul 21/i);
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowLeft");
  await expect(restingChart).toContainText(/Jul 20/i);
  await page.keyboard.press("Escape");
  await expect(chart).toContainText(/Jul 21/i);
  await expect(restingChart).toContainText(/Jul 21/i);
});

test("alcohol fixtures distinguish source coverage states", async ({ page }) => {
  await page.goto("/lab/chart-system");
  await expect(page.getByText("WHOOP journal export required", { exact: true })).toBeVisible();
  await expect(page.getByText("Journal data through Jul 20", { exact: true })).toBeVisible();
  await expect(page.getByText("No recorded alcohol in this range", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Recorded alcohol dates" }).getByRole("listitem")).toHaveCount(3);
});
