import { state } from "../state.js";
import { searchPlacesData } from "../data/tripsData.js";
import { renderHeader } from "../components/Header.js";
import { searchConcerts } from "../services/concertService.js";

const PRIMARY_CATEGORIES = ["All", "Places", "Concerts", "Events", "Guides", "Stories"];
const SUB_FILTERS = [
  { id: "All", label: "All" },
  { id: "Cafes", label: "Cafes ⌄" },
  { id: "Specialty coffee", label: "Specialty coffee ⌄" },
  { id: "Open now", label: "Open now ⌄" },
  { id: "More filters", label: "More filters" }
];

export function renderSearchView() {
  const query = state.searchQuery;
  const places = searchPlacesData;
  const concerts = searchConcerts(query);

  return `
    <div class="search-page">
      ${renderHeader()}

      <div class="search-page__content">
        <!-- Search Input Bar -->
        <div class="search-input-card">
          <div class="search-input-wrapper">
            <svg class="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="search-input-field" value="${escapeHtml(query)}" placeholder="Search places, cafes, sights..." data-action="update-search-query" />
            ${query ? '<button class="search-clear-btn" data-action="clear-search-query">✕</button>' : ''}
          </div>
          <button class="btn btn--icon search-filter-btn" aria-label="Filters" data-action="toggle-filters">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
        </div>

        <!-- Brand Guidelines Section 07: Active Location Tag Pill -->
        <div class="search-location-tags" style="display: flex; align-items: center; gap: 8px; margin: 8px 0 12px 0;">
          <span class="location-tag-pill">
            <span>📍 ${escapeHtml(state.activeTrip.destination.toUpperCase())}</span>
            <span class="location-tag-pill__close" data-action="clear-search-query">×</span>
          </span>
        </div>

        <!-- Primary Category Tabs -->
        <div class="primary-tabs-scroll">
          ${PRIMARY_CATEGORIES.map(
            (cat) => `
              <button class="primary-tab-btn ${state.searchCategory === cat ? 'is-active' : ''}" data-cat="${cat}">
                ${cat}
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

        <!-- Inline Leaflet Map Card -->
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

        <!-- Results Header Bar -->
        <div class="results-header">
          <span class="results-count">${state.searchCategory === "Concerts" ? `${concerts.length} live concerts` : `${places.length} results`}</span>
          <div class="results-sort">
            <span class="sort-label">Sort:</span>
            <select class="sort-select" data-action="change-sort">
              <option value="top-rated">Upcoming dates ⌄</option>
              <option value="popular">Popular tours ⌄</option>
            </select>
          </div>
        </div>

        <!-- Results List -->
        <div class="results-list">
          ${state.searchCategory === "Concerts"
            ? concerts.map((c) => renderConcertCard(c)).join("")
            : places.map((place) => renderSearchPlaceCard(place)).join("")}
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

function renderSearchPlaceCard(place) {
  const isSaved = state.savedPlaceIds.has(place.id);

  return `
    <div class="search-place-card">
      <div class="search-place-card__thumb" style="background-image: url('${place.image}')"></div>
      <div class="search-place-card__content">
        <div class="search-place-card__header">
          <h3 class="search-place-card__title">${escapeHtml(place.name)}</h3>
          <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${place.id}" aria-label="Bookmark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
        <p class="search-place-card__location">${escapeHtml(place.neighborhood)}</p>
        <div class="search-place-card__rating">
          <span class="rating-star">★ ${place.rating}</span>
          <span class="rating-count">(${place.reviewsCount})</span>
          <span class="rating-sep">•</span>
          <span class="rating-category">${escapeHtml(place.category)}</span>
        </div>
        <p class="search-place-card__desc">${escapeHtml(place.description)}</p>
      </div>
    </div>
  `;
}

function renderConcertCard(concert) {
  return `
    <div class="search-place-card concert-card" style="border-left: 3px solid var(--orange);">
      <div class="search-place-card__thumb" style="background-image: url('${concert.image}'); display: flex; align-items: flex-start; padding: 6px;">
        <span style="background: rgba(23,24,23,0.85); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;">${concert.icon} ${escapeHtml(concert.genre)}</span>
      </div>
      <div class="search-place-card__content">
        <div class="search-place-card__header">
          <h3 class="search-place-card__title">${escapeHtml(concert.artist)}</h3>
          <button class="btn btn--outline btn--xs" data-action="add-idea-to-itinerary" data-title="${escapeHtml(concert.title)}" data-location="${escapeHtml(concert.venue)}" style="font-size: 0.72rem; padding: 2px 8px;">+ Itinerary</button>
        </div>
        <p class="search-place-card__location" style="color: var(--orange); font-weight: 600;">📍 ${escapeHtml(concert.venue)} • ${escapeHtml(concert.city)}</p>
        <div class="search-place-card__rating" style="margin-top: 4px;">
          <span class="voice-mono" style="font-size: 0.75rem; color: var(--ink-muted);">${escapeHtml(concert.dates)}</span>
          <span class="rating-sep">•</span>
          <span class="rating-category" style="font-size: 0.75rem;">${escapeHtml(concert.tour)}</span>
        </div>
        <div style="margin-top: 8px; display: flex; gap: 8px;">
          <a href="${concert.ticketUrl}" target="_blank" rel="noopener" class="btn btn--primary btn--xs" style="text-decoration: none; font-size: 0.72rem; padding: 4px 10px;">🎟️ Get Tickets</a>
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
