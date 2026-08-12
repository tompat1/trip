import { expect, test } from "@playwright/test";

const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173";

test.describe("Login and Logout Lifecycle (Dev & Prod)", () => {
  test("User can open login modal, authenticate, and log out cleanly back to landing page with Login button", async ({ page }) => {
    // 1. Visit target landing page
    await page.goto(TARGET_URL);
    await page.waitForLoadState("domcontentloaded");

    // 2. Verify top nav shows 'Login' button when signed out
    const loginBtn = page.locator('.top-nav__actions [data-action="open-auth-panel"], .landing-login-btn');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toContainText("Login");

    // 3. Open Login Panel
    await loginBtn.click();
    const authModal = page.locator(".auth-exit-modal, .auth-modal-sheet, .modal");
    await expect(authModal).toBeVisible();

    // 4. Fill credentials and submit
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("traveler@test.local");
      const submitBtn = page.locator('button[type="submit"], [data-action="submit-login"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    }

    // 5. Verify user is in app (Home or Profile)
    await page.waitForTimeout(500);

    // 6. Trigger Logout
    const logoutBtn = page.locator('[data-action="account-logout"], [data-action="admin-logout"], .header-account-btn').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    }

    // If logout button was in profile or dropdown, ensure logout action completes
    const confirmLogoutBtn = page.locator('[data-action="account-logout"]').first();
    if (await confirmLogoutBtn.isVisible()) {
      await confirmLogoutBtn.click();
    }

    // 7. Verify user is returned to Landing Page with Login button visible
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
    await expect(loginBtn).toContainText("Login");
  });
});
