import { state } from "../state.js";
import { searchPlacesData } from "../data/tripsData.js";
import { renderHeader } from "../components/Header.js";
import { searchConcerts } from "../services/concertService.js";
import { renderIcon } from "../utils/icons.js";
import { getPersonaQuickIntentChips, getPersonaSignals, getPersonaSummary, rankItemsByPersonas } from "../utils/personaSignals.js";

const PRIMARY_CATEGORIES = ["All", "Places", "Concerts", "Events", "Guides", "Stories"];
const QUICK_INTENT_CHIPS = [
  { id: "coffee", label: "☕ Specialty Coffee", query: "Best coffee shops", personas: ["☕ Coffee Hunter"] },
  { id: "concerts", label: "🎵 Live Concerts", query: "Live concerts & gigs", cat: "Concerts", personas: ["🎟️ Event Scout", "🎨 Culture Seeker", "🌙 Night Owl"] },
  { id: "food", label: "🍽️ Local Eats & Bistros", query: "Top rated restaurants", personas: ["🍽️ Food Explorer"] },
  { id: "museums", label: "🖼️ Museums & Art", query: "Museums and galleries" },
  { id: "sunset", label: "🌅 Golden Hour Spots", query: "Best sunset views", personas: ["🌅 Sunrise Chaser", "📸 Memory Maker"] },
  { id: "bars", label: "🍷 Wine Bars", query: "Cozy wine bars", personas: ["🍷 Wine Seeker", "🌙 Night Owl"] }
];

const SUB_FILTERS = [
  { id: "All", label: "All Spots" },
  { id: "Persona picks", label: "For my personas ✦" },
  { id: "Open now", label: "Open now 🟢" },
  { id: "Top rated", label: "Top rated ★ 4.8+" },
  { id: "Specialty coffee", label: "Specialty coffee ☕" },
  { id: "Walking distance", label: "Walking distance 🚶" }
];

export function renderSearchView() {
  const query = state.searchQuery || "";
  const currentTrip = state.activeTrip;
  const activePersonaSignals = getActivePersonaSignals();
  const quickIntentChips = getPersonaQuickIntentChips(activePersonaSignals, QUICK_INTENT_CHIPS);
  const personaSummary = getPersonaSummary(activePersonaSignals.map((signal) => signal.persona));

  return `
    <div class="search-page">
      ${renderHeader()}

      <div class="search-page__content">
        <!-- Hero Search Header Card -->
        <div class="search-hero-card card-pattern-map" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); position: relative; overflow: hidden; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <span class="voice-mono" style="font-size: 0.72rem; color: var(--orange); font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Intelligent Search</span>
              <h2 class="voice-serif" style="font-size: 1.4rem; font-weight: 800; color: var(--ink); margin-top: 2px;">Discover ${escapeHtml(currentTrip.destination)} ${currentTrip.flag || ''}</h2>
              ${activePersonaSignals.length ? `
                <p class="search-persona-context">
                  Tuned for ${escapeHtml(personaSummary)}
                </p>
              ` : ""}
            </div>
            <span style="font-size: 0.7rem; background: rgba(56,92,115,0.12); color: var(--blue); padding: 4px 10px; border-radius: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
              ⚡ Live Enriched
            </span>
          </div>

          <!-- Main Search Input -->
          <div class="search-input-card" style="box-shadow: var(--shadow-sm); border: 1px solid var(--line-light);">
            <div class="search-input-wrapper">
              <svg class="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" class="search-input-field" value="${escapeHtml(query)}" placeholder="Search cafes, concerts, sights in ${escapeHtml(currentTrip.destination)}..." data-action="update-search-query" />
              ${query ? '<button class="search-clear-btn" data-action="clear-search-query" title="Clear query">✕</button>' : ''}
            </div>
            <button class="btn btn--icon search-filter-btn" aria-label="Filters" data-action="toggle-filters" title="Filter results">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
          </div>

          <!-- Quick Intent Shortcut Chips -->
          <div class="quick-intents-scroll" style="display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; margin-top: 12px; padding-bottom: 2px;">
            ${quickIntentChips.map(chip => `
              <button class="chip ${chip.isPersona ? "chip--persona" : ""}" data-action="apply-quick-intent" data-query="${escapeHtml(chip.query)}" data-cat="${chip.cat || 'All'}" style="white-space: nowrap; font-size: 0.78rem; padding: 6px 12px; border-radius: 18px; border: 1px solid var(--line-light); background: rgba(255,255,255,0.85); cursor: pointer; transition: transform 0.15s ease;">
                ${chip.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Primary Category Tabs -->
        <div class="primary-tabs-scroll">
          ${PRIMARY_CATEGORIES.map(
            (cat) => `
              <button class="primary-tab-btn ${state.searchCategory === cat ? 'is-active' : ''}" data-cat="${cat}">
                ${cat === 'Concerts' ? '🎵 Concerts' : cat}
              </button>
            `
          ).join("")}
        </div>

        <!-- Sub-filter Pills -->
        <div class="sub-filters-scroll">
          ${SUB_FILTERS.map(
            (sf) => `
              <button class="sub-filter-pill ${state.searchSubFilter === sf.id ? 'is-active' : ''}" data-subfilter="${sf.id}">
                ${sf.label}
              </button>
            `
          ).join("")}
        </div>

        <!-- Inline Interactive Leaflet Map Card -->
        <div class="search-map-card">
          <div id="search-map-container" class="search-map"></div>
          <button class="btn btn--light search-area-btn" data-action="search-this-area">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
            <span>Search this area</span>
          </button>
          <button class="btn btn--icon search-location-btn" aria-label="Locate me" data-action="locate-user">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
          </button>
        </div>

        <div id="search-results-region">
          ${renderSearchResults()}
        </div>

        <!-- Floating Sticky "View on map" button -->
        <div class="sticky-map-fab-wrap">
          <button class="btn btn--dark btn--pill floating-map-btn" data-action="toggle-full-map">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z"/><path d="M9 3v15"/><path d="M15 6v15"/></svg>
            <span>View on map</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderSearchResults() {
  const query = state.searchQuery || "";
  const activePersonaSignals = getActivePersonaSignals();
  const placesForTrip = [
    ...filterPlacesByActiveTrip(searchPlacesData),
    ...getTourismSearchPlaces(state.activeTrip),
  ];
  const places = applySearchSubFilter(
    rankItemsByPersonas(filterPlacesByQuery(placesForTrip, query), activePersonaSignals),
    state.searchSubFilter,
    activePersonaSignals,
  );
  const concerts = applySearchSubFilter(
    rankItemsByPersonas(filterConcertsByQuery(getTripConcerts(state.activeTrip), query), activePersonaSignals),
    state.searchSubFilter,
    activePersonaSignals,
  );

  return `
    <!-- Results Header Bar -->
    <div class="results-header">
      <span class="results-count">${state.searchCategory === "Concerts" ? `${concerts.length} live concerts` : `${places.length} trip spots`}</span>
      <div class="results-sort">
        <span class="sort-label">Sort:</span>
        <select class="sort-select" data-action="change-sort">
          <option value="top-rated">Top rated ⌄</option>
          <option value="closest">Closest ⌄</option>
          <option value="popular">Most popular ⌄</option>
        </select>
      </div>
    </div>

    <!-- Results List -->
    <div class="results-list">
      ${state.searchCategory === "Concerts"
        ? (concerts.length ? concerts.map((c) => renderConcertCard(c)).join("") : renderEmptySearch("No live concerts found for this search."))
        : (places.length ? places.map((place) => renderSearchPlaceCard(place)).join("") : renderEmptySearch("No places matched your query."))
      }
    </div>
  `;
}

function filterPlacesByActiveTrip(places) {
  const destinationCity = (state.activeTrip?.destination || "").split(",")[0].trim().toLowerCase();
  if (!destinationCity) return places;

  return places.filter((place) =>
    (place.neighborhood || "").toLowerCase().includes(destinationCity)
  );
}

function filterPlacesByQuery(places, query) {
  if (!query || !query.trim()) return places;
  const q = query.toLowerCase().trim();
  return places.filter(p => {
    const name = p.name || p.title || "";
    const category = p.category || "";
    const neighborhood = p.neighborhood || p.subtitle || p.distance || "";
    const description = p.description || p.reason || "";
    return (
      name.toLowerCase().includes(q) ||
      category.toLowerCase().includes(q) ||
      neighborhood.toLowerCase().includes(q) ||
      description.toLowerCase().includes(q)
    );
  });
}

function getActivePersonaSignals() {
  const selected = state.userPreferences ? Array.from(state.userPreferences) : [];
  return getPersonaSignals(selected);
}

function applySearchSubFilter(items, subFilter, activePersonaSignals) {
  if (!subFilter || subFilter === "All") return items;
  if (subFilter === "Persona picks") {
    if (!activePersonaSignals.length) return items;
    return items.filter((item) => (item.__personaScore || 0) > 0);
  }
  if (subFilter === "Top rated") {
    return items.filter((item) => Number(item.rating || 0) >= 4.8 || Number(item.__personaScore || 0) >= 20);
  }
  if (subFilter === "Specialty coffee") {
    return items.filter((item) => itemMatchesAny(item, ["coffee", "cafe", "café", "espresso", "roaster", "specialty"]));
  }
  if (subFilter === "Walking distance") {
    return items.filter((item) => itemLooksWalkable(item));
  }
  return items;
}

function itemMatchesAny(item, terms) {
  const text = [item.name, item.title, item.category, item.neighborhood, item.subtitle, item.distance, item.description, item.reason]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.some((term) => text.includes(term));
}

function itemLooksWalkable(item) {
  const distance = String(item.distance || item.subtitle || item.neighborhood || "").toLowerCase();
  return /\b\d+(\.\d+)?\s?(m|km)\b/.test(distance) || ["walk", "walking", "nearby", "from trip center"].some((term) => distance.includes(term));
}

function getTourismSearchPlaces(trip) {
  return [...(trip?.tourismPois || []), ...(trip?.hiddenGems || []), ...(trip?.osmPlaces || [])].map((place) => ({
    ...place,
    name: place.name || place.title,
    neighborhood: place.neighborhood || place.subtitle || place.distance || trip.destination,
    description: place.description || place.reason || `${place.category || "Place"} from OpenTripMap.`,
    image: place.image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=80",
  }));
}

function getTripConcerts(trip) {
  const seen = new Set();
  return [...(trip?.events || []), ...searchConcerts("")]
    .filter((concert) => {
      const key = `${concert.title}-${concert.venue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function filterConcertsByQuery(concerts, query) {
  if (!query || !query.trim()) return concerts;
  const q = query.toLowerCase().trim();
  return concerts.filter(c =>
    (c.artist || "").toLowerCase().includes(q) ||
    (c.title || "").toLowerCase().includes(q) ||
    (c.venue || "").toLowerCase().includes(q) ||
    (c.city || "").toLowerCase().includes(q) ||
    (c.genre || "").toLowerCase().includes(q)
  );
}

function renderSearchPlaceCard(place) {
  const name = place.name || place.title || "Place";
  const location = place.neighborhood || place.subtitle || place.distance || "";
  const description = place.description || place.reason || "";
  const personaMatches = Array.isArray(place.__personaMatches) ? place.__personaMatches.slice(0, 2) : [];
  const isOpenTripMap = place.source === "OpenTripMap";
  const isOpenStreetMap = String(place.source || "").startsWith("OpenStreetMap") || place.sourceRole === "osm";
  const providerLabel = isOpenStreetMap ? "OpenStreetMap" : "OpenTripMap";
  const image = place.image || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=80";
  return `
    <div class="search-place-card" style="transition: transform 0.15s ease, box-shadow 0.2s ease;">
      <div class="search-place-card__thumb" style="background-image: url('${image}')">
      </div>
      <div class="search-place-card__content">
        <div class="search-place-card__header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div>
            <h3 class="search-place-card__title">${escapeHtml(name)}</h3>
            <p class="search-place-card__location" style="margin-top: 2px;">📍 ${escapeHtml(location)}</p>
          </div>
          <button class="btn btn--outline btn--xs" data-action="add-idea-to-itinerary" data-title="${escapeHtml(name)}" data-location="${escapeHtml(location)}" style="font-size: 0.72rem; padding: 3px 9px; flex-shrink: 0;" title="Add to itinerary">+ Itinerary</button>
        </div>

        <div class="search-place-card__rating" style="margin-top: 6px;">
          ${isOpenTripMap || isOpenStreetMap ? `
            <span class="rating-star" style="color: var(--orange); font-weight: 700;">${providerLabel}</span>
            ${place.distance ? `<span class="rating-count">${escapeHtml(place.distance)}</span>` : ""}
          ` : `
            <span class="rating-star" style="color: var(--sun); font-weight: 700;">★ ${escapeHtml(place.rating)}</span>
            <span class="rating-count">(${escapeHtml(place.reviewsCount)})</span>
          `}
          <span class="rating-sep">•</span>
          <span class="rating-category">${escapeHtml(place.category)}</span>
          ${isOpenTripMap || isOpenStreetMap ? "" : `
            <span class="rating-sep">•</span>
            <span style="font-size: 0.72rem; color: var(--green); font-weight: 600;">Open now 🟢</span>
          `}
        </div>
        <p class="search-place-card__desc" style="margin-top: 6px; font-size: 0.82rem; color: var(--ink-muted); line-height: 1.4;">${escapeHtml(description)}</p>
        ${personaMatches.length ? `
          <div class="search-persona-match">
            ${personaMatches.map((match) => `<span>${escapeHtml(match)}</span>`).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderConcertCard(concert) {
  const isSaved = state.savedPlaceIds && state.savedPlaceIds.has(concert.id);
  const personaMatches = Array.isArray(concert.__personaMatches) ? concert.__personaMatches.slice(0, 2) : [];

  return `
    <div class="search-place-card concert-card" style="border-left: 3px solid var(--orange);">
      <div class="search-place-card__thumb" style="background-image: url('${concert.image}'); display: flex; align-items: flex-start; justify-content: space-between; padding: 8px;">
        <span style="background: rgba(23,24,23,0.85); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;">${concert.icon} ${escapeHtml(concert.genre)}</span>
        <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${concert.id}" style="background: rgba(255,255,255,0.92); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: none; box-shadow: var(--shadow-sm); cursor: pointer;" aria-label="Bookmark event" title="${isSaved ? 'Saved to planning bucket' : 'Bookmark event'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSaved ? 'var(--orange)' : 'none'}" stroke="${isSaved ? 'var(--orange)' : 'currentColor'}" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
      <div class="search-place-card__content">
        <div class="search-place-card__header">
          <h3 class="search-place-card__title">${escapeHtml(concert.artist)}</h3>
          <button class="btn btn--outline btn--xs" data-action="add-idea-to-itinerary" data-title="${escapeHtml(concert.title)}" data-location="${escapeHtml(concert.venue)}" style="font-size: 0.72rem; padding: 3px 9px;">+ Itinerary</button>
        </div>
        <p class="search-place-card__location" style="color: var(--orange); font-weight: 600;">📍 ${escapeHtml(concert.venue)} • ${escapeHtml(concert.city)}</p>
        <div class="search-place-card__rating" style="margin-top: 4px;">
          <span class="voice-mono" style="font-size: 0.75rem; color: var(--ink-muted);">${escapeHtml(concert.dates)}</span>
          <span class="rating-sep">•</span>
          <span class="rating-category" style="font-size: 0.75rem;">${escapeHtml(concert.tour)}</span>
        </div>
        <div style="margin-top: 10px; display: flex; gap: 8px;">
          <a href="${concert.ticketUrl}" target="_blank" rel="noopener" class="btn btn--primary btn--xs" style="text-decoration: none; font-size: 0.75rem; padding: 5px 12px;">🎟️ Get Tickets</a>
        </div>
        ${personaMatches.length ? `
          <div class="search-persona-match">
            ${personaMatches.map((match) => `<span>${escapeHtml(match)}</span>`).join("")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

function renderEmptySearch(msg) {
  return `
    <div style="text-align: center; padding: 40px 20px; background: var(--paper-card); border: 1px dashed var(--line); border-radius: var(--radius-lg);">
      <span style="font-size: 2rem; display: block; margin-bottom: 8px;">🔍</span>
      <h4 style="font-weight: 700; color: var(--ink);">${escapeHtml(msg)}</h4>
      <p style="font-size: 0.82rem; color: var(--ink-muted); margin-top: 4px;">Try searching for coffee, concerts, food, or sights.</p>
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
