export function addDaysToDate(startDate, daysCount = 1) {
  const start = parseLocalDate(startDate);
  if (!start) return null;
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, Number(daysCount) || 1) - 1);
  return end;
}

export function getTripDateStatus(trip = {}, now = new Date()) {
  const safeTrip = trip || {};
  const start = parseLocalDate(safeTrip.startDate);
  const end = addDaysToDate(safeTrip.startDate, safeTrip.daysCount);
  if (!start || !end) {
    return { state: "unknown", start: null, end: null, daysUntil: 0, daysSinceEnd: 0 };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const daysUntil = Math.ceil((startDay.getTime() - today.getTime()) / 86400000);
  const daysSinceEnd = Math.floor((today.getTime() - endDay.getTime()) / 86400000);

  if (daysUntil > 0) return { state: "upcoming", start, end, daysUntil, daysSinceEnd: 0 };
  if (daysSinceEnd > 0) return { state: "done", start, end, daysUntil, daysSinceEnd };
  return { state: "active", start, end, daysUntil, daysSinceEnd: 0 };
}

export function formatTripDateRangeFromParts(startDate, daysCount) {
  const start = parseLocalDate(startDate);
  const end = addDaysToDate(startDate, daysCount);
  if (!start || !end) return "Upcoming";
  const formatter = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function parseLocalDate(value = "") {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
