import { expect, test } from "@playwright/test";

test.describe("MediVault Navigation and Rendering Tests", () => {
  test("should load the landing page successfully", async ({ page }) => {
    await page.goto("/");
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("MediVault Landing Page");
  });

  test("should load the about page successfully", async ({ page }) => {
    await page.goto("/about");
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("About MediVault");
  });

  test("should load the login page successfully", async ({ page }) => {
    await page.goto("/login");
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Login");
  });
});
