import { expect, test } from "@playwright/test";

const STOCKHOLM_TRIP = {
  id: "stockholm-smoke",
  user_id: "smoke-user",
  destination: "Stockholm, Sweden",
  flag: "🇸🇪",
  dates: "May 1-5, 2027",
  days_count: 5,
  start_date: "2027-05-01",
  latitude: 59.3293,
  longitude: 18.0686,
};

const PARIS_TRIP = {
  id: "paris-smoke",
  user_id: "smoke-user",
  destination: "Paris, France",
  flag: "🇫🇷",
  dates: "Oct 3-8, 2027",
  days_count: 6,
  start_date: "2027-10-03",
  latitude: 48.8566,
  longitude: 2.3522,
};

async function mockTripWorker(page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/session") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          principal: {
            role: "traveler",
            userId: "smoke-user",
            authType: "traveler-session",
          },
        }),
      });
      return;
    }

    if (pathname === "/api/health") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ready", bindings: {}, secrets: {}, services: {}, generatedAt: "2027-01-01T00:00:00.000Z" }),
      });
      return;
    }

    if (pathname === "/api/trips") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, trips: [STOCKHOLM_TRIP, PARIS_TRIP] }),
      });
      return;
    }

    if (pathname === "/api/trips/stockholm-smoke/events") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          events: [
            {
              id: "stockholm-calendar",
              trip_id: "stockholm-smoke",
              title: "Vasa Museum Morning",
              location: "Vasa Museum",
              day_index: 0,
              day_name: "Day 1",
              start_time: "10:00",
              end_time: "12:00",
              event_type: "sight",
              icon: "📍",
              color_scheme: "peach",
            },
          ],
        }),
      });
      return;
    }

    if (pathname === "/api/trips/paris-smoke/events") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          events: [
            {
              id: "paris-calendar",
              trip_id: "paris-smoke",
              title: "Louvre Museum",
              location: "Paris",
              day_index: 0,
              start_time: "10:00",
              end_time: "12:00",
            },
          ],
        }),
      });
      return;
    }

    if (pathname === "/api/opentripmap/places") {
      const lat = Number(url.searchParams.get("lat"));
      const isStockholm = Math.abs(lat - 59.3293) < 0.1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          places: isStockholm
            ? [{ id: "vasa-poi", xid: "vasa-poi", title: "Vasa Museum", name: "Vasa Museum", address: "Stockholm", category: "Museum", distance: "1.2 km" }]
            : [{ id: "louvre-poi", xid: "louvre-poi", title: "Louvre Museum", name: "Louvre Museum", address: "Paris", category: "Museum", distance: "1.0 km" }],
          providerStatus: [{ provider: "opentripmap", status: "ok" }],
        }),
      });
      return;
    }

    if (pathname === "/api/places/nearby") {
      const lat = Number(url.searchParams.get("lat"));
      const isStockholm = Math.abs(lat - 59.3293) < 0.1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "ready",
          places: isStockholm
            ? [{ id: "montelius", name: "Monteliusvägen", address: "Stockholm", category: "Viewpoint", distance: "900 m" }]
            : [{ id: "marais", name: "Le Marais Walk", address: "Paris", category: "Walk", distance: "800 m" }],
          providerStatus: [{ provider: "openstreetmap", status: "ok" }],
        }),
      });
      return;
    }

    if (pathname === "/api/events/discover") {
      const destination = url.searchParams.get("destination") || "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          events: destination.includes("Stockholm")
            ? [{ id: "stockholm-live", title: "Stockholm Indie Night", venue: "Södermalm", city: "Stockholm", dates: "May 2", provider: "ticketmaster", sourceRole: "ticketmaster" }]
            : [{ id: "paris-jazz", title: "Paris Jazz Night", venue: "Le Marais", city: "Paris", dates: "Oct 4", provider: "ticketmaster", sourceRole: "ticketmaster" }],
          providerStatus: [{ provider: "ticketmaster", status: "ok" }],
        }),
      });
      return;
    }

    if (pathname === "/api/places/media") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, media: { hero: null, gallery: [] }, providerStatus: [] }),
      });
      return;
    }

    if (url.hostname.includes("open-meteo.com") || url.hostname.includes("gbfs") || url.hostname.includes("openagenda")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ elevation: [28], results: [], events: [], data: [] }),
      });
      return;
    }

    await route.continue();
  });
}

test("current trip data stays isolated across home, search, events, and plan map", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await mockTripWorker(page);

  await page.goto("/");
  await expect(page.getByText("Stockholm, Sweden").first()).toBeVisible();

  await expect(page.getByText("Trip intelligence")).toBeVisible();
  await expect(page.getByText("Stockholm Indie Night")).toBeVisible();
  await expect(page.getByText("Louvre Museum")).toHaveCount(0);
  await expect(page.getByText("Paris Jazz Night")).toHaveCount(0);

  await page.getByRole("button", { name: /^Search$/i }).click();
  await expect(page.getByText("Discover Stockholm, Sweden")).toBeVisible();
  await expect(page.getByText("Louvre Museum")).toHaveCount(0);

  const concertsTab = page.locator('.primary-tab-btn[data-cat="Concerts"]');
  await concertsTab.scrollIntoViewIfNeeded();
  await concertsTab.click();
  await expect(page.getByText("Stockholm Indie Night")).toBeVisible();
  await expect(page.getByText("Paris Jazz Night")).toHaveCount(0);

  await page.getByRole("button", { name: /^Trips$/i }).click();
  await expect(page.getByText("Saint-Germain Bistro")).toHaveCount(0);
  await page.locator('[data-subtab="plan"]').click();
  await page.locator('[data-viewmode="map"]').click();
  await expect(page.getByText("1 calendar activities plotted")).toBeVisible();
  await expect(page.getByText("Louvre Museum")).toHaveCount(0);

  await page.locator('.view-mode-pill[data-viewmode="timeline"]').click();
  await expect(page.getByText("Vasa Museum Morning")).toBeVisible();
  await expect(page.getByText("Louvre Museum")).toHaveCount(0);
});
