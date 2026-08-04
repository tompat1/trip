const COUNTRY_FLAG_MAP = {
  france: "🇫🇷",
  paris: "🇫🇷",
  japan: "🇯🇵",
  tokyo: "🇯🇵",
  kyoto: "🇯🇵",
  greece: "🇬🇷",
  crete: "🇬🇷",
  heraklion: "🇬🇷",
  chania: "🇬🇷",
  denmark: "🇩🇰",
  copenhagen: "🇩🇰",
  italy: "🇮🇹",
  rome: "🇮🇹",
  florence: "🇮🇹",
  venice: "🇮🇹",
  spain: "🇪🇸",
  barcelona: "🇪🇸",
  madrid: "🇪🇸",
  uk: "🇬🇧",
  "united kingdom": "🇬🇧",
  england: "🇬🇧",
  london: "🇬🇧",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  america: "🇺🇸",
  "new york": "🇺🇸",
  australia: "🇦🇺",
  sydney: "🇦🇺",
  germany: "🇩🇪",
  berlin: "🇩🇪",
  netherlands: "🇳🇱",
  amsterdam: "🇳🇱",
  portugal: "🇵🇹",
  lisbon: "🇵🇹",
  thailand: "🇹🇭",
  bangkok: "🇹🇭",
  switzerland: "🇨🇭",
  canada: "🇨🇦",
  mexico: "🇲🇽",
  brazil: "🇧🇷",
  indonesia: "🇮🇩",
  bali: "🇮🇩",
  sweden: "🇸🇪",
  norway: "🇳🇴",
  finland: "🇫🇮",
  iceland: "🇮🇸",
  ireland: "🇮🇪",
  morocco: "🇲🇦",
  egypt: "🇪🇬",
  korea: "🇰🇷",
  seoul: "🇰🇷"
};

import { renderIcon } from "./icons.js";

const DEFAULT_MAP_ICON = renderIcon("map", "country-fallback-icon");

/**
 * Automatically infers country flag emoji based on destination string or country name
 */
export function getCountryFlagEmoji(destinationStr = "") {
  if (!destinationStr) return DEFAULT_MAP_ICON;
  const normalized = destinationStr.toLowerCase().trim();

  // Check direct keywords
  for (const [key, flag] of Object.entries(COUNTRY_FLAG_MAP)) {
    if (normalized.includes(key)) {
      return flag;
    }
  }

  // Check 2-letter ISO code at end of string (e.g. "Paris, FR")
  const parts = normalized.split(/[\s,]+/);
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length === 2 && /^[a-z]{2}$/.test(lastPart)) {
    return isoToEmoji(lastPart.toUpperCase());
  }

  return DEFAULT_MAP_ICON;
}

function isoToEmoji(code) {
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}
