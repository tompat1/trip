import { expect, test } from "@playwright/test";

async function mockTripWorker(page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/session") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          principal: {
            role: "admin",
            userId: "calendar-smoke-admin",
            authType: "smoke",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ready",
        trips: [],
        places: [],
        events: [],
        companions: [],
        providerStatus: [],
      }),
    });
  });
}

async function openDayCalendar(page) {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await mockTripWorker(page);

  const sessionReady = page.waitForResponse((response) => response.url().includes("/api/session"));
  await page.goto("/");
  await sessionReady;

  await expect(page.getByText("Before you go")).toBeVisible();
  await page.getByText("Before you go").click();

  await expect(page.getByRole("button", { name: /Day/i })).toBeVisible();
  await page.getByRole("button", { name: /Day/i }).click();
  await expect(page.locator('.calendar-grid-wrapper[data-calendar-mode="day"]')).toBeVisible();
}

async function dragLocatorBy(page, locator, deltaX, deltaY) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX / 2, startY + deltaY / 2, { steps: 6 });
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 6 });
  await page.mouse.up();
}

test("calendar day cards can be dragged and resized", async ({ page }) => {
  await openDayCalendar(page);

  const eventCard = page.locator(".event-card").filter({ hasText: "Louvre Museum" }).first();
  const eventTime = eventCard.locator(".event-card__time");

  await expect(eventCard).toBeVisible();
  await expect(eventTime).toContainText("10:00");

  const initialTime = await eventTime.textContent();
  await dragLocatorBy(page, eventCard.locator(".event-drag-handle"), 0, 96);

  await expect.poll(async () => eventTime.textContent()).not.toBe(initialTime);
  const movedTime = await eventTime.textContent();

  await dragLocatorBy(page, eventCard.locator(".event-resize-handle"), 0, 72);

  await expect.poll(async () => eventTime.textContent()).not.toBe(movedTime);
});
