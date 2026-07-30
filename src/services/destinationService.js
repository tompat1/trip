/**
 * destinationService — Dynamically fetches authentic Wikipedia summaries and Workers AI
 * destination briefs for ANY destination added by a user.
 */

const summaryCache = new Map();
const pendingFetches = new Set();

export async function fetchDynamicDestinationBrief(destinationName = "") {
  const cleanName = String(destinationName || "").trim();
  if (!cleanName) return null;

  if (summaryCache.has(cleanName)) {
    return summaryCache.get(cleanName);
  }

  if (pendingFetches.has(cleanName)) {
    return null;
  }

  pendingFetches.add(cleanName);

  const primarySearch = cleanName.split(",")[0].trim();
  const searchCandidates = [cleanName, primarySearch].filter(Boolean);

  try {
    for (const candidate of searchCandidates) {
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`;
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        if (response.ok) {
          const data = await response.json();
          if (data && data.extract && data.type !== "disambiguation") {
            const brief = {
              destination: cleanName,
              title: data.title || candidate,
              description: data.description || "",
              standfirst: data.extract,
              whyStop: data.description ? `Recognized as ${data.description.toLowerCase()}.` : "",
              thumbnail: data.thumbnail?.source || "",
              heroImage: data.originalimage?.source || data.thumbnail?.source || "",
              source: "Wikipedia",
              sourceUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(candidate)}`,
            };
            summaryCache.set(cleanName, brief);
            pendingFetches.delete(cleanName);
            return brief;
          }
        }
      } catch (err) {
        console.warn(`Wikipedia summary fetch error for ${candidate}:`, err);
      }
    }
  } finally {
    pendingFetches.delete(cleanName);
  }

  return null;
}
