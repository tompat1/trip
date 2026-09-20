import { renderIcon } from "../utils/icons.js";

function isPermanentTouristAttraction(spot) {
  if (!spot) return false;
  const title = String(spot.title || spot.name || "").toLowerCase().trim();
  const category = String(spot.category || spot.tag || spot.kind || "").toLowerCase().trim();

  const invalidKeywords = [
    "airport", "aeroporto", "aerodrome", "flygplats", "lufthavn", "aeroway",
    "autonomous port", "port of", "prefecture", "police station", "consulate", "embassy",
    "office", "administrative", "utility", "bus stop", "tram stop",
    "olympic", "olympics", "opening ceremony", "closing ceremony", "ceremony",
    "paralympics", "championship", "tournament", "world cup", "expo 20", "marathon 20",
    "festival 20", "summit 20", "conference", "press conference", "parade 20"
  ];

  if (invalidKeywords.some((kw) => title.includes(kw) || category.includes(kw))) {
    return false;
  }

  if (/^(19\d\d|20[0-2]\d)\b/.test(title) || /\b(202[0-9])\s+(summer|winter|games|ceremony|cup|match)\b/.test(title)) {
    return false;
  }

  return true;
}

export function getDestinationFallbackImage(destination = "", width = 600) {
  const lower = String(destination || "").toLowerCase();
  const image = lower.includes("madrid")
    ? "https://images.unsplash.com/photo-1539037116277-4db20889f2d4"
    : lower.includes("barcelona")
      ? "https://images.unsplash.com/photo-1583422409516-2895a77efded"
      : lower.includes("crete") || lower.includes("heraklion")
        ? "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff"
        : lower.includes("paris")
          ? "https://images.unsplash.com/photo-1502602898657-3e91760cbb34"
          : "https://images.unsplash.com/photo-1488646953014-85cb44e25828";
  return `${image}?auto=format&fit=crop&w=${width}&q=80`;
}

export function getTopAttractionsForTrip(trip) {
  const seenTitles = new Set();
  const rawPlaces = [
    ...(trip.mapPins || []),
    ...(trip.tourismPois || []),
    ...(trip.ideas || []),
    ...(trip.explorePlaces || []),
    ...(trip.hiddenGems || []),
    ...(trip.osmPlaces || []),
  ];

  const livePlaces = [];
  for (const p of rawPlaces) {
    if (!p || !isPermanentTouristAttraction(p)) continue;
    const titleKey = String(p.title || p.name || "").toLowerCase().trim();
    if (!titleKey || seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    livePlaces.push(p);
  }

  if (livePlaces.length > 0) {
    return livePlaces.slice(0, 18).map((spot, idx) => ({
      id: spot.id || `live-poi-${idx}`,
      title: spot.title || spot.name,
      category: spot.category || spot.tag || spot.kind || "Attraction",
      rating: spot.rating || 4.8,
      image: spot.image || spot.photoUrl || spot.heroImage || getDestinationFallbackImage(trip.destination, 400),
      geoLabel: spot.geoLabel || spot.subtitle || (spot.dist ? `${(spot.dist / 1000).toFixed(1)} km away` : (trip.destination || "Local")),
      lat: spot.lat || spot.latitude || spot.coordinates?.[0],
      lng: spot.lng || spot.longitude || spot.coordinates?.[1]
    }));
  }

  const cleanCity = trip.destination ? trip.destination.split(",")[0].trim() : "Local";

  return [
    { id: "g1", title: `${cleanCity} Central Landmark & Historic Center`, category: "Historic Landmark", rating: 4.9, image: getDestinationFallbackImage(trip.destination, 400), geoLabel: `${cleanCity} Center` },
    { id: "g2", title: `${cleanCity} Old Town Quarter & Architecture`, category: "Historic Quarter", rating: 4.8, image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80", geoLabel: "Historic District" },
    { id: "g3", title: `${cleanCity} Central Food Market & Gastronomy`, category: "Local Gastronomy", rating: 4.7, image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80", geoLabel: "Market Square" },
    { id: "g4", title: `${cleanCity} Museum of Art & Culture`, category: "Culture & Art", rating: 4.8, image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=400&q=80", geoLabel: "Museum Quarter" },
    { id: "g5", title: `${cleanCity} Waterfront & Promenade Vistas`, category: "Scenic View", rating: 4.9, image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=400&q=80", geoLabel: "Harbor Front" }
  ];
}

if (typeof window !== "undefined") {
  window.__getTopAttractionsForTrip = getTopAttractionsForTrip;
}

export function isPoiAddedToCalendar(events, spotTitle) {
  if (!events || !events.length || !spotTitle) return false;
  const titleLower = spotTitle.toLowerCase().trim();
  return events.some(e => {
    const eTitle = (e.title || "").toLowerCase();
    const eLoc = (e.location || "").toLowerCase();
    return eTitle.includes(titleLower) || titleLower.includes(eTitle) || eLoc.includes(titleLower);
  });
}

export function renderPoiMapCanvas(trip, topPOIs, { page = false } = {}) {
  const destination = trip.destination || "Destination";
  const area = destination.split(",")[0].trim();
  const events = trip.calendarEvents || [];
  const activeSpot = topPOIs[0] || {
    title: `${area} Central Landmark`,
    rating: 4.9,
    category: "Landmark",
    geoLabel: "1.2 km away",
    image: getDestinationFallbackImage(trip.destination, 400)
  };
  const activeSpotLat = Number(activeSpot.lat ?? activeSpot.latitude ?? activeSpot.coordinates?.[0]);
  const activeSpotLng = Number(activeSpot.lng ?? activeSpot.longitude ?? activeSpot.coordinates?.[1]);
  const activeSpotDirectionData = Number.isFinite(activeSpotLat) && Number.isFinite(activeSpotLng)
    ? `data-destination-lat="${escapeHtml(activeSpotLat)}" data-destination-lng="${escapeHtml(activeSpotLng)}"`
    : "";
  const isLouvreAdded = isPoiAddedToCalendar(events, activeSpot.title);

  const spotDetail = activeSpot.geoLabel || `${(0.8).toFixed(1)} km away`;
  const shellClass = page
    ? "poi-map-backdrop-shell poi-map-hero-card poi-map-backdrop-shell--page"
    : "poi-map-backdrop-shell poi-map-hero-card";

  return `
    <div class="${shellClass}" aria-label="Trip attractions map">
      <div id="poi-map-container" class="poi-map-canvas" aria-hidden="true"></div>

      <div class="poi-map-top-bar">
        <div class="poi-map-trip-pill">
          <span class="poi-map-trip-flag">${trip.flag || "🇫🇷"}</span>
          <span class="poi-map-trip-destination voice-serif">${escapeHtml(destination)}</span>
          <span class="poi-map-trip-dates voice-mono">${escapeHtml(trip.dates || "Dates TBD")}</span>
        </div>
        ${page ? "" : `
          <button
            class="poi-map-inline-btn"
            type="button"
            data-action="toggle-poi-map-fullscreen"
            title="Full screen map"
            aria-label="Toggle full screen map"
          >
            ${renderIcon("arrowsOut")}
          </button>
        `}
      </div>

      <div class="poi-map-floating-card" id="poi-map-floating-card">
        <button
          class="poi-map-card-close"
          type="button"
          data-action="close-poi-map-card"
          aria-label="Close place details"
        >
          ${renderIcon("x")}
        </button>

        <div class="poi-map-card-body">
          <img
            id="poi-floating-img"
            class="poi-map-card-thumb"
            src="${escapeHtml(activeSpot.image)}"
            alt="${escapeHtml(activeSpot.title)}"
            onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80';"
          />
          <div class="poi-map-card-copy">
            <div class="poi-map-card-title-row">
              <h5 id="poi-floating-title" class="poi-map-card-title">${escapeHtml(activeSpot.title)}</h5>
              <span id="poi-floating-tag" class="poi-map-card-tag voice-mono">${escapeHtml(activeSpot.category || "Landmark")}</span>
            </div>
            <p id="poi-floating-detail" class="poi-map-card-meta">
              ★ ${activeSpot.rating || 4.9} · ${escapeHtml(spotDetail)} · Open until 18:00
            </p>
          </div>
        </div>

        <div class="poi-map-card-actions">
          <button
            class="btn btn--primary btn--xs poi-map-card-directions-btn"
            type="button"
            data-action="open-directions"
            data-spot-name="${escapeHtml(activeSpot.title)}"
            ${activeSpotDirectionData}
          >
            ${renderIcon("navigation")} Directions
          </button>
          <button
            id="poi-floating-plan-btn"
            class="btn btn--outline btn--xs poi-map-card-plan-btn ${isLouvreAdded ? "is-added" : ""}"
            type="button"
            data-action="add-poi-event"
            data-spot-name="${escapeHtml(activeSpot.title)}"
          >
            ${isLouvreAdded ? "✓ Added" : "+ Plan"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
