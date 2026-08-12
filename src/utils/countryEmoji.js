import { findPrimaryAirportForDestination } from "../services/airportService.js";

const DEFAULT_EMOJI_FLAG = "✈️";

const ISO_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG",
  "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS",
  "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO",
  "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"
];

// Build dynamic ISO country registry using runtime Intl.DisplayNames
const COUNTRY_NAME_TO_ISO = new Map();
if (typeof Intl !== "undefined" && Intl.DisplayNames) {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    for (const code of ISO_COUNTRY_CODES) {
      try {
        const name = displayNames.of(code);
        if (name) COUNTRY_NAME_TO_ISO.set(name.toLowerCase(), code);
      } catch {}
    }
  } catch {}
}

// Common aliases for countries where Intl name differs slightly from common usage
COUNTRY_NAME_TO_ISO.set("uk", "GB");
COUNTRY_NAME_TO_ISO.set("united kingdom", "GB");
COUNTRY_NAME_TO_ISO.set("england", "GB");
COUNTRY_NAME_TO_ISO.set("scotland", "GB");
COUNTRY_NAME_TO_ISO.set("usa", "US");
COUNTRY_NAME_TO_ISO.set("united states", "US");
COUNTRY_NAME_TO_ISO.set("america", "US");
COUNTRY_NAME_TO_ISO.set("south korea", "KR");
COUNTRY_NAME_TO_ISO.set("korea", "KR");

// Cache for dynamically geocoded country codes
const DYNAMIC_LOCATION_COUNTRY_CACHE = new Map();

/**
 * Dynamically resolves 2-letter ISO country code for any destination string.
 * Uses text matching against Intl country names, airport service location resolution,
 * and ISO code extraction without static city/flag maps.
 */
export function resolveDynamicCountryCode(destinationStr = "") {
  if (!destinationStr || typeof destinationStr !== "string") return "";
  const normalized = destinationStr.toLowerCase().trim();
  if (!normalized) return "";

  if (DYNAMIC_LOCATION_COUNTRY_CACHE.has(normalized)) {
    return DYNAMIC_LOCATION_COUNTRY_CACHE.get(normalized);
  }

  // 1. Direct check if destination text ends with or includes ISO 2-letter code (e.g., "Paris, FR" or "Ortigia, IT")
  const parts = normalized.split(/[\s,]+/);
  const lastPart = parts[parts.length - 1]?.toUpperCase();
  if (lastPart && lastPart.length === 2 && ISO_COUNTRY_CODES.includes(lastPart)) {
    DYNAMIC_LOCATION_COUNTRY_CACHE.set(normalized, lastPart);
    return lastPart;
  }

  // 2. Check if text includes any full country name from Intl registry
  for (const [countryName, code] of COUNTRY_NAME_TO_ISO.entries()) {
    if (normalized.includes(countryName)) {
      DYNAMIC_LOCATION_COUNTRY_CACHE.set(normalized, code);
      return code;
    }
  }

  // 3. Dynamic airport service location resolution
  try {
    const airport = findPrimaryAirportForDestination(destinationStr);
    if (airport) {
      if (airport.country) {
        const countryKey = airport.country.toLowerCase().trim();
        const codeFromCountry = COUNTRY_NAME_TO_ISO.get(countryKey);
        if (codeFromCountry) {
          DYNAMIC_LOCATION_COUNTRY_CACHE.set(normalized, codeFromCountry);
          return codeFromCountry;
        }
      }
      if (airport.flag && !airport.flag.includes("<")) {
        const iso = emojiToIso(airport.flag);
        if (iso) {
          DYNAMIC_LOCATION_COUNTRY_CACHE.set(normalized, iso);
          return iso;
        }
      }
    }
  } catch {}

  return "";
}

/**
 * Automatically infers country flag emoji dynamically for ANY destination worldwide.
 * Always returns a clean Unicode emoji flag (never HTML or SVG).
 */
export function getCountryFlagEmoji(destinationStr = "") {
  const code = resolveDynamicCountryCode(destinationStr);
  if (code) {
    const flag = isoToEmoji(code);
    if (flag) return flag;
  }
  return DEFAULT_EMOJI_FLAG;
}

/**
 * Returns ISO 2-letter country code dynamically.
 */
export function getCountryCode(destinationStr = "") {
  const code = resolveDynamicCountryCode(destinationStr);
  return code || "XX";
}

/**
 * Non-blocking dynamic geocoding for obscure locations that resolves ISO country code
 * via OpenStreetMap Nominatim and caches it.
 */
export async function resolveCountryFlagAsync(destinationStr = "", fetchImpl = fetch) {
  if (!destinationStr || typeof destinationStr !== "string") return DEFAULT_EMOJI_FLAG;
  const normalized = destinationStr.toLowerCase().trim();

  const cachedIso = resolveDynamicCountryCode(destinationStr);
  if (cachedIso) return isoToEmoji(cachedIso);

  try {
    const clean = destinationStr.split(",")[0].trim() || destinationStr.trim();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(clean)}&limit=1&addressdetails=1`;
    const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      const countryCode = String(data[0]?.address?.country_code || "").toUpperCase();
      if (countryCode && ISO_COUNTRY_CODES.includes(countryCode)) {
        DYNAMIC_LOCATION_COUNTRY_CACHE.set(normalized, countryCode);
        return isoToEmoji(countryCode);
      }
    }
  } catch {}

  return getCountryFlagEmoji(destinationStr);
}

/**
 * Sanitizes flag string to ensure it is a clean Unicode emoji string.
 */
export function sanitizeFlagEmoji(flag, destination = "") {
  if (!flag || typeof flag !== "string" || flag.includes("<") || flag.includes("svg") || flag === "🗺️" || flag === "•") {
    return getCountryFlagEmoji(destination);
  }
  return flag;
}

export function isoToEmoji(code) {
  if (!code || typeof code !== "string" || code.length !== 2) return "";
  return String.fromCodePoint(...[...code.toUpperCase()].map((char) => 127397 + char.charCodeAt(0)));
}

export function emojiToIso(emoji) {
  if (!emoji || typeof emoji !== "string" || emoji.length < 2) return "";
  const codePoints = [...emoji].map((c) => c.codePointAt(0) - 127397);
  if (codePoints.length === 2 && codePoints.every((cp) => cp >= 65 && cp <= 90)) {
    return String.fromCharCode(...codePoints);
  }
  return "";
}
