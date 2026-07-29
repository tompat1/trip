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
            userId: "smoke-admin",
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

test("template picker CTA stays tappable above mobile app chrome", async ({ page }) => {
  await mockTripWorker(page);

  const sessionReady = page.waitForResponse((response) => response.url().includes("/api/session"));
  await page.goto("/");
  await sessionReady;

  await expect(page.getByRole("button", { name: /get started/i })).toBeVisible();
  await page.getByRole("button", { name: /After the journey/i }).click();
  await page.getByRole("button", { name: /^Templates$/i }).click();
  await page.getByRole("button", { name: /Postcard/i }).first().click();

  const picker = page.getByRole("dialog", { name: /Postcard/i });
  const createButton = picker.getByRole("button", { name: /Create/i });
  await expect(picker).toBeVisible();
  await expect(createButton).toBeVisible();
  await expect(createButton).toBeEnabled();

  const box = await createButton.boundingBox();
  expect(box).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect.poll(async () => {
    const settledBox = await createButton.boundingBox();
    return settledBox ? settledBox.y + settledBox.height : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(viewport.height - 8);

  const settledBox = await createButton.boundingBox();
  expect(settledBox).not.toBeNull();
  const receivesTap = await page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return Boolean(element?.closest?.('[data-action="confirm-template-picker"]'));
  }, {
    x: settledBox.x + settledBox.width / 2,
    y: settledBox.y + settledBox.height / 2,
  });

  expect(receivesTap).toBe(true);
});
