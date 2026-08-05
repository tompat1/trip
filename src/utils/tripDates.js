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

export function inferStartDateFromText(value = "") {
  const text = String(value || "");
  const year = text.match(/\b(20\d\d)\b/)?.[1];
  if (!year) return "";
  const lower = text.toLowerCase();
  const monthMap = [
    ["sept", "09"],
    ["sep", "09"],
    ["jan", "01"],
    ["feb", "02"],
    ["mar", "03"],
    ["apr", "04"],
    ["may", "05"],
    ["jun", "06"],
    ["jul", "07"],
    ["aug", "08"],
    ["oct", "10"],
    ["nov", "11"],
    ["dec", "12"],
  ];
  const month = monthMap.find(([name]) => lower.includes(name))?.[1] ||
    (/fall|autumn/.test(lower) ? "09" : /winter/.test(lower) ? "12" : /spring/.test(lower) ? "03" : /summer/.test(lower) ? "06" : "");
  return month ? `${year}-${month}-01` : "";
}

function parseLocalDate(value = "") {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
