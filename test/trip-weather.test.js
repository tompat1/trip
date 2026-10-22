import assert from "node:assert/strict";
import test from "node:test";

import { fetchOpenMeteoWeather } from "../src/services/weatherService.js";
import { formatTripLocalDateTime } from "../src/utils/tripLocalTime.js";

test("formats the current time in the selected trip timezone", () => {
  const instant = new Date("2026-10-22T12:30:00Z");

  assert.match(
    formatTripLocalDateTime({ timezone: "Asia/Tokyo" }, instant),
    /22 Oct 21:30$/,
  );
  assert.match(
    formatTripLocalDateTime({ timezone: "America/New_York" }, instant),
    /22 Oct 08:30$/,
  );
});

test("uses the destination UTC offset when an IANA timezone is unavailable", () => {
  const instant = new Date("2026-10-22T23:45:00Z");
  assert.match(
    formatTripLocalDateTime({ utcOffsetSeconds: 9 * 60 * 60 }, instant),
    /23 Oct 08:45$/,
  );
  assert.equal(formatTripLocalDateTime({ utcOffsetSeconds: null }, instant), "");
});

test("keeps Open-Meteo destination timezone metadata with the weather", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    timezone: "Asia/Tokyo",
    timezone_abbreviation: "JST",
    utc_offset_seconds: 32400,
    current: {
      temperature_2m: 24,
      apparent_temperature: 25,
      relative_humidity_2m: 60,
      wind_speed_10m: 8,
      weather_code: 1,
      is_day: 1,
    },
    daily: {
      time: ["2026-10-22"],
      weather_code: [1],
      temperature_2m_max: [25],
      temperature_2m_min: [17],
      sunrise: ["2026-10-22T05:52"],
      sunset: ["2026-10-22T17:01"],
    },
  });

  try {
    const weather = await fetchOpenMeteoWeather(35.6762, 139.6503);
    assert.equal(weather.timezone, "Asia/Tokyo");
    assert.equal(weather.timezoneAbbreviation, "JST");
    assert.equal(weather.utcOffsetSeconds, 32400);
    assert.equal(weather.temp, "24°C");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
