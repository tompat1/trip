export function formatTripLocalDateTime(weather = {}, now = new Date()) {
  const timeZone = getValidTimeZone(weather.timezone);
  const utcOffsetSeconds = Number(weather.utcOffsetSeconds);
  const hasUtcOffset = weather.utcOffsetSeconds !== null
    && weather.utcOffsetSeconds !== ""
    && Number.isFinite(utcOffsetSeconds);

  if (!timeZone && !hasUtcOffset) return "";

  const displayDate = timeZone
    ? now
    : new Date(now.getTime() + utcOffsetSeconds * 1000);

  const parts = new Intl.DateTimeFormat([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timeZone || "UTC",
  }).formatToParts(displayDate).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.weekday || ""} ${parts.day || ""} ${parts.month || ""} ${parts.hour || "00"}:${parts.minute || "00"}`.trim();
}

function getValidTimeZone(timeZone = "") {
  if (!timeZone) return "";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return "";
  }
}
