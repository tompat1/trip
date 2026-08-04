import { state } from "../state.js";
import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_ROUTE_LINE_SVG } from "../components/BrandAssets.js";
import { getTripDateStatus } from "../utils/tripDates.js";
import { getOptimizedImageUrl } from "../utils/responsiveImages.js";

export function renderHomeView() {
  const trip = state.activeTrip;

  if (!trip) {
    return renderSignedOutWelcomeHero();
  }

  const isLiveMode = state.tripMode;
  const checklist = state.checklists ? (state.checklists[trip.id] || trip.checklist) : (trip.checklist || []);
  const liveTimeStr = formatLiveTimeString();
  const statusText = getDynamicTripCountdown(trip);
  const tripIdeas = getHomeTripIdeas(trip);
  const greeting = getTimeAwareGreeting();
  const firstName = getFirstName(state.userProfile?.name || "Thomas");
  const glossary = getLocalGlossaryForTrip(trip);

  return `
    <div class="home-page">
      ${renderHeader()}

      <div class="home-page__content">
        <section class="greeting-row card-pattern-map">
          <div class="greeting-text">
            <h2 class="greeting-title voice-serif" style="font-size: 1.45rem; font-weight: 700; color: var(--ink);">${escapeHtml(greeting)}, ${escapeHtml(firstName)} 👋</h2>
            <p class="greeting-status">
              ${isLiveMode 
                ? `<span class="live-pulse-dot"></span> <strong>You are in ${escapeHtml(trip.destination)}</strong> <span class="status-meta">${trip.weather?.condition || 'Fair'} • ${trip.weather?.temp || '20°C'} • ${liveTimeStr}</span>` 
                : `<span class="upcoming-badge">${statusText}</span>`}
            </p>
            <div class="local-glossary" aria-label="Useful local phrases for ${escapeHtml(trip.destination)}">
              <div class="local-glossary__header">
                <span class="voice-mono">${escapeHtml(glossary.language)} basics</span>
                <strong>${escapeHtml(glossary.sample)}</strong>
              </div>
              <div class="local-glossary__chips" aria-label="${escapeHtml(glossary.language)} phrase ticker">
                <div class="local-glossary__track">
                  ${renderGlossaryPhraseChips(glossary.phrases)}
                  <span class="local-glossary__loop" aria-hidden="true">
                    ${renderGlossaryPhraseChips(glossary.phrases)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Dotted Route Line Banner (Guidelines Section 07) -->
        <div class="route-line-dashed-banner" data-action="go-plan-timeline" role="button" tabindex="0" aria-label="Open trip timeline">
          <div class="route-line-dashed-banner__header">
            <span class="route-line-dashed-banner__title voice-mono">${escapeHtml(trip.destination.toUpperCase())} ROUTE PATH</span>
            <span class="route-line-dashed-banner__cta voice-mono">
              ${escapeHtml(trip.upcomingActivity.title)}
              <span class="route-line-dashed-banner__arrow">${renderIcon("arrowRight")}</span>
            </span>
          </div>
          <div class="route-line-dashed-banner__map">
            ${TRIP_ROUTE_LINE_SVG()}
          </div>
        </div>

        ${renderTripIntelligenceCard(trip)}

        ${renderHomeAiConciergeCard(trip)}

        ${isLiveMode ? renderLiveJourneyModules(trip) : renderPlanningModules(trip, checklist)}

        <!-- Common Section: Ideas for your trip -->
        <section class="home-section">
          <div class="section-header">
            <h3 class="section-title">Ideas for your trip</h3>
            <div class="section-header__actions">
              <button class="btn btn--icon btn--ghost" data-action="refresh-trip-ideas" aria-label="Refresh trip ideas" title="Refresh trip ideas">
                ${renderIcon("refresh")}
              </button>
              <button class="btn btn--link" data-action="go-search">See all</button>
            </div>
          </div>
          <div class="horizontal-scroll-container">
            ${tripIdeas.map(idea => {
              const isOpenTripMap = idea.source === "OpenTripMap";
              const isOpenStreetMap = String(idea.source || "").startsWith("OpenStreetMap") || idea.sourceRole === "osm";
              const providerLabel = isOpenStreetMap ? "OpenStreetMap" : "OpenTripMap";
              return `
              <div class="idea-card">
                <div class="idea-card__image" style="background-image: url('${getOptimizedImageUrl(idea.image, { width: 480, quality: 75 })}')">
                  <button class="btn-bookmark ${state.savedPlaceIds.has(idea.id) ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${idea.id}" aria-label="Bookmark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${state.savedPlaceIds.has(idea.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
                <div class="idea-card__body">
                  <h4 class="idea-card__title">${escapeHtml(idea.title)}</h4>
                  <p class="idea-card__subtitle">${escapeHtml(idea.subtitle)}</p>
                  <div class="idea-card__meta">
                    <span class="rating-badge">${isOpenTripMap || isOpenStreetMap ? providerLabel : `★ ${escapeHtml(idea.rating)}`}</span>
                    <span class="duration-badge">${isOpenTripMap || isOpenStreetMap ? escapeHtml(idea.distance || idea.category) : `⏱ ${escapeHtml(idea.duration)}`}</span>
                  </div>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </section>

        <!-- Common Section: Events during your stay -->
        <section class="home-section">
          <div class="section-header">
            <h3 class="section-title">Events during your stay</h3>
            <div class="section-header__actions">
              <button class="btn btn--icon btn--ghost" data-action="refresh-trip-events" aria-label="Refresh trip events" title="Refresh trip events">
                ${renderIcon("refresh")}
              </button>
              <button class="btn btn--link" data-action="go-search">See all</button>
            </div>
          </div>
          <div class="events-grid">
            ${trip.events.map(ev => {
              const eventId = ev.id || ev.title;
              const isSaved = state.savedPlaceIds && state.savedPlaceIds.has(eventId);
              return `
                <div class="event-pill-card" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <span class="event-pill-icon">${ev.icon}</span>
                    <div class="event-pill-info" style="min-width: 0;">
                      <h4 class="event-pill-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(ev.title)}</h4>
                      <p class="event-pill-dates">${escapeHtml(ev.dates)}</p>
                    </div>
                  </div>
                  <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${escapeHtml(eventId)}" aria-label="Bookmark event" style="padding: 4px; border: none; background: transparent; cursor: pointer; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;" title="${isSaved ? 'Saved to planning bucket' : 'Bookmark to planning bucket'}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'var(--orange)' : 'none'}" stroke="${isSaved ? 'var(--orange)' : 'currentColor'}" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        ${!isLiveMode ? renderLiveJourneyModules(trip) : renderPlanningModules(trip, checklist)}
      </div>
    </div>
  `;
}

function getHomeTripIdeas(trip) {
  const liveIdeas = [...(trip.tourismPois || []), ...(trip.hiddenGems || []), ...(trip.osmPlaces || [])].slice(0, 3);
  return [...liveIdeas, ...(trip.ideas || [])].slice(0, 6);
}

function renderGlossaryPhraseChips(phrases = []) {
  return phrases.map((item) => `
    <span class="local-glossary__chip" title="${escapeHtml(item.note || item.en)}">
      <small>${escapeHtml(item.en)}</small>
      <strong>${escapeHtml(item.local)}</strong>
    </span>
  `).join("");
}

function renderTripIntelligenceCard(trip) {
  const status = state.getTripIntelligenceStatus ? state.getTripIntelligenceStatus(trip.id) : { status: "idle" };
  const outdoor = trip.outdoorIntel || trip.tripIntelligence?.outdoor || {};
  const signals = trip.travelSignals || trip.tripIntelligence?.signals || [];
  const mobility = trip.mobilityOptions || trip.tripIntelligence?.mobility || [];
  const headsUps = trip.headsUps || trip.tripIntelligence?.headsUps || [];
  const isLoading = status.status === "loading";
  const providerStatus = status.providerStatus || trip.tripIntelligence?.providerStatus || [];
  const liveProviderCount = providerStatus.filter((provider) => provider.status === "ok").length;
  const label = isLoading ? "Refreshing" : status.status === "error" ? "Needs attention" : `${liveProviderCount || 0} live sources`;
  const primarySignal = signals[0];
  const visibleHeadsUps = prioritizeHeadsUps(headsUps);
  const facts = [
    {
      icon: "mountain",
      label: outdoor.terrainLabel || "Terrain unknown",
      value: Number.isFinite(outdoor.elevation) ? `${outdoor.elevation} m` : "Pending",
    },
    outdoor.marine ? {
      icon: "waves",
      label: outdoor.marine.label || "Marine context",
      value: outdoor.marine.waveHeightMax !== null && outdoor.marine.waveHeightMax !== undefined ? `${outdoor.marine.waveHeightMax} m waves` : "No signal",
    } : null,
    {
      icon: "alertTriangle",
      label: primarySignal?.title || outdoor.flood?.label || "Travel signals",
      value: primarySignal?.distance || `${signals.length} active`,
    },
  ].filter(Boolean);

  return `
    <section class="trip-intel-card card-pattern-poly" aria-label="Trip intelligence">
      <div class="trip-intel-card__header">
        <div>
          <h3 class="trip-intel-card__title">Trip intelligence</h3>
          <p class="trip-intel-card__subtitle">Outdoor context, safety signals, commute notes and things to know.</p>
        </div>
        <div class="trip-intel-card__actions">
          <span class="badge ${status.status === "error" ? "badge--warning" : "badge--info"} voice-mono">${escapeHtml(label)}</span>
          <button class="btn btn--icon btn--ghost" data-action="refresh-trip-intelligence" aria-label="Refresh trip intelligence" title="Refresh trip intelligence">
            ${renderIcon("refresh")}
          </button>
        </div>
      </div>
      <div class="trip-intel-facts">
        ${facts.map((fact) => `
          <div class="trip-intel-fact">
            <span class="trip-intel-fact__icon">${renderIcon(fact.icon)}</span>
            <span class="trip-intel-fact__label">${escapeHtml(fact.label)}</span>
            <strong class="trip-intel-fact__value">${escapeHtml(fact.value)}</strong>
          </div>
        `).join("")}
      </div>
      ${headsUps.length ? `
        <div class="trip-heads-up-list" aria-label="Things to know">
          ${visibleHeadsUps.map(renderHeadsUpDisclosure).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function prioritizeHeadsUps(headsUps = []) {
  const priority = ["water-quality", "local-commute", "alcohol-age", "drink-driving-limit", "speed-limits", "tourist-rules"];
  return [...headsUps].sort((a, b) => {
    const aIndex = priority.indexOf(a.id);
    const bIndex = priority.indexOf(b.id);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

function renderHeadsUpDisclosure(item = {}) {
  const title = item.title || "Things to know";
  const detail = item.detail || "";
  const actionUrl = sanitizeHref(item.actionUrl || "");
  return `
    <details class="trip-heads-up trip-heads-up--${escapeHtml(item.severity || "info")}">
      <summary class="trip-heads-up__summary" aria-label="${escapeHtml(`${title}. Open full note`)}">
        <span class="trip-heads-up__icon">${renderIcon(item.icon || "info")}</span>
        <span class="trip-heads-up__body">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(detail)}</span>
        </span>
        <small class="trip-heads-up__source">${escapeHtml(item.source || "Guidance")}</small>
        <span class="trip-heads-up__chevron" aria-hidden="true">${renderIcon("chevronDown")}</span>
      </summary>
      <p class="trip-heads-up__full">${escapeHtml(detail)}</p>
      ${actionUrl ? `
        <a class="trip-heads-up__link" href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(item.actionLabel || "Open provider")}
          <span aria-hidden="true">${renderIcon("arrowRight")}</span>
        </a>
      ` : ""}
    </details>
  `;
}

function renderPlanningModules(trip, checklist) {
  return `
    <div class="dashboard-grid">
      <!-- Widget 1: Continue Planning Checklist (MapPattern Overlay) -->
      <div class="dashboard-card planning-widget card-pattern-map">
        <div class="dashboard-card__header">
          <h3 class="dashboard-card__title">Continue planning</h3>
          <button class="btn btn--outline btn--xs" data-action="add-checklist-item" title="Add planning task">${renderIcon("plus")} Add task</button>
        </div>
        <ul class="checklist-items">
          ${checklist.map(item => `
            <li class="checklist-item ${item.completed ? 'is-completed' : ''}">
              <span class="checkbox-circle ${item.completed ? 'is-checked' : ''}" data-action="toggle-check" data-item-id="${item.id}">
                ${item.completed ? renderIcon("check") : ''}
              </span>
              <span class="checklist-label" data-action="toggle-check" data-item-id="${item.id}">${escapeHtml(item.label)}</span>
              <div class="checklist-item-actions">
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="edit-checklist-item" data-item-id="${item.id}" data-label="${escapeHtml(item.label)}" title="Edit task">${renderIcon("pencil")}</button>
                <button class="btn btn--icon btn--ghost item-action-btn" data-action="delete-checklist-item" data-item-id="${item.id}" title="Delete task">${renderIcon("trash")}</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- Widget 2: Leaflet Interactive Map Preview Card (PolyLines Overlay) -->
      <div class="dashboard-card map-widget card-pattern-poly">
        <div id="home-map-container" class="home-map"></div>
        <div class="map-card-footer">
          <span class="map-location-badge">📍 Map Preview: ${escapeHtml(trip.destination)}</span>
          <button class="btn btn--link btn--sm" data-action="go-live">Full Map &rsaquo;</button>
        </div>
      </div>

      <!-- Widget 3: Live Open-Meteo Weather Context Card (PolyLines Overlay) -->
      ${(() => {
        const currentDateStr = new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", month: "short" }).format(new Date());
        const upcomingForecast = (trip.weather?.forecast || []).filter(f => f.day !== "Today");
        const sunTimes = getWeatherSunTimes(trip.weather || {});

        return `
          <div class="dashboard-card weather-widget card-pattern-poly">
            <div class="dashboard-card__header" style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h3 class="dashboard-card__title" style="margin: 0; line-height: 1.2;">Weather in ${escapeHtml(trip.destination.split(',')[0])}</h3>
                <span class="voice-mono" style="font-size: 0.75rem; color: var(--ink-muted); margin-top: 3px; display: block;">${currentDateStr}</span>
              </div>
              <button class="btn btn--icon btn--ghost" data-action="refresh-weather" title="Fetch live Open-Meteo weather" style="color: var(--ink-muted); padding: 4px;">
                ${renderIcon("refreshCw")}
              </button>
            </div>
            <div class="weather-main">
              <div class="weather-current">
                <span class="weather-icon">${trip.weather?.icon || '☀️'}</span>
                <div class="weather-temp-wrap">
                  <span class="weather-degree">${trip.weather?.temp || '20°C'}</span>
                  <span class="weather-condition">${trip.weather?.condition || 'Fair'}</span>
                  ${trip.weather?.feelsLike ? `<span class="weather-feels">Feels like ${trip.weather.feelsLike}</span>` : ''}
                </div>
              </div>
              <div class="weather-sun-times" aria-label="Current day sunrise and sunset">
                ${sunTimes.hasTimes ? `
                  <span>
                    ${renderIcon("sunrise")}
                    <small>Sun up</small>
                    <strong>${escapeHtml(sunTimes.sunrise)}</strong>
                  </span>
                  <span>
                    ${renderIcon("sunset")}
                    <small>Sun down</small>
                    <strong>${escapeHtml(sunTimes.sunset)}</strong>
                  </span>
                ` : `
                  <span class="weather-sun-times__pending">
                    ${renderIcon("sun")}
                    <small>Sun times</small>
                    <strong>Refresh for today</strong>
                  </span>
                `}
              </div>
              <div class="weather-forecast-pills">
                ${upcomingForecast.map(f => `
                  <div class="forecast-pill">
                    <span class="forecast-day">${f.day}</span>
                    <span class="forecast-icon">${f.icon || '☀️'}</span>
                    <span class="forecast-temp">${f.temp}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      })()}
    </div>
  `;
}

function renderLiveJourneyModules(trip) {
  const nearby = trip.nearbyNow || [];
  const liveInfo = trip.liveInfo || [];

  return `
    <div class="live-modules-wrapper">
      <!-- Section: Nearby Now -->
      ${nearby.length ? `
        <section class="home-section mb-md">
          <div class="section-header">
            <h3 class="section-title">Nearby now</h3>
          </div>
          <div class="nearby-grid">
            ${nearby.map(nb => `
              <div class="nearby-card">
                <span class="nearby-icon">${nb.icon}</span>
                <div class="nearby-info">
                  <h4 class="nearby-title">${escapeHtml(nb.title)}</h4>
                  <p class="nearby-dist">${escapeHtml(nb.distance)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Section: Live Travel Info -->
      ${liveInfo.length ? `
        <section class="home-section mb-md">
          <div class="section-header">
            <h3 class="section-title">Live travel info</h3>
          </div>
          <div class="live-info-grid">
            ${liveInfo.map(info => `
              <div class="live-info-card">
                <span class="live-info-icon">${info.icon}</span>
                <div class="live-info-body">
                  <h4 class="live-info-title">${escapeHtml(info.title)}</h4>
                  <p class="live-info-sub">${escapeHtml(info.subtitle)}</p>
                </div>
                <span class="badge ${info.statusClass}">${info.status}</span>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;
}

function getDynamicTripCountdown(trip) {
  if (!trip) return "Planning mode";
  const status = getTripDateStatus(trip);
  const destCity = (trip.destination || "").split(",")[0];

  if (status.state === "upcoming") {
    return `${status.daysUntil} ${status.daysUntil === 1 ? 'day' : 'days'} until your trip to ${destCity}`;
  } else if (status.state === "active") {
    return `✈️ Trip to ${destCity} in progress`;
  }
  if (status.state === "done") return `🏁 Journey complete · ${destCity} archive`;
  return `📖 Travel memory archive (${destCity})`;
}

function formatLiveTimeString() {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function getWeatherSunTimes(weather = {}) {
  const sunrise = weather.sunrise || formatWeatherPanelTime(weather.sunriseIso);
  const sunset = weather.sunset || formatWeatherPanelTime(weather.sunsetIso);
  return {
    sunrise,
    sunset,
    hasTimes: Boolean(sunrise && sunset),
  };
}

function formatWeatherPanelTime(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const LOCAL_GLOSSARIES = {
  france: {
    language: "French",
    sample: "Bonjour",
    phrases: [
      ["Good morning", "Bonjour"],
      ["Good day", "Bonne journée"],
      ["Good evening", "Bonsoir"],
      ["Good night", "Bonne nuit"],
      ["Hello", "Salut"],
      ["Bye", "Au revoir"],
      ["Thanks", "Merci"],
      ["Yes", "Oui"],
      ["No", "Non"],
      ["Please", "S'il vous plaît"],
    ],
  },
  greece: {
    language: "Greek",
    sample: "Kaliméra",
    phrases: [
      ["Good morning", "Kaliméra"],
      ["Good day", "Kalí iméra"],
      ["Good evening", "Kalispéra"],
      ["Good night", "Kalinýchta"],
      ["Hello", "Yássas"],
      ["Bye", "Antío"],
      ["Thanks", "Efcharistó"],
      ["Yes", "Ne"],
      ["No", "Óchi"],
      ["Please", "Parakaló"],
    ],
  },
  spain: {
    language: "Spanish",
    sample: "Hola",
    phrases: [
      ["Good morning", "Buenos días"],
      ["Good day", "Buen día"],
      ["Good evening", "Buenas tardes"],
      ["Good night", "Buenas noches"],
      ["Hello", "Hola"],
      ["Bye", "Adiós"],
      ["Thanks", "Gracias"],
      ["Yes", "Sí"],
      ["No", "No"],
      ["Please", "Por favor"],
    ],
  },
  uk: {
    language: "English",
    sample: "Hello",
    phrases: [
      ["Good morning", "Good morning"],
      ["Good day", "Good day"],
      ["Good evening", "Good evening"],
      ["Good night", "Good night"],
      ["Hello", "Hello / Cheers"],
      ["Bye", "Cheerio / Bye"],
      ["Thanks", "Thanks / Cheers"],
      ["Yes", "Yes"],
      ["No", "No"],
      ["Please", "Please"],
    ],
  },
  japan: {
    language: "Japanese",
    sample: "Konnichiwa",
    phrases: [
      ["Good morning", "Ohayō gozaimasu"],
      ["Good day", "Konnichiwa"],
      ["Good evening", "Konbanwa"],
      ["Good night", "Oyasumi nasai"],
      ["Hello", "Konnichiwa"],
      ["Bye", "Sayōnara"],
      ["Thanks", "Arigatō gozaimasu"],
      ["Yes", "Hai"],
      ["No", "Iie"],
      ["Please", "Onegai shimasu"],
    ],
  },
  sweden: {
    language: "Swedish",
    sample: "Hej",
    phrases: [
      ["Good morning", "God morgon"],
      ["Good day", "God dag"],
      ["Good evening", "God kväll"],
      ["Good night", "God natt"],
      ["Hello", "Hej"],
      ["Bye", "Hej då"],
      ["Thanks", "Tack"],
      ["Yes", "Ja"],
      ["No", "Nej"],
      ["Please", "Snälla"],
    ],
  },
  italy: {
    language: "Italian",
    sample: "Buongiorno",
    phrases: [
      ["Good morning", "Buongiorno"],
      ["Good day", "Buona giornata"],
      ["Good evening", "Buonasera"],
      ["Good night", "Buonanotte"],
      ["Hello", "Ciao"],
      ["Bye", "Arrivederci"],
      ["Thanks", "Grazie"],
      ["Yes", "Sì"],
      ["No", "No"],
      ["Please", "Per favore"],
    ],
  },
  germany: {
    language: "German",
    sample: "Guten Tag",
    phrases: [
      ["Good morning", "Guten Morgen"],
      ["Good day", "Guten Tag"],
      ["Good evening", "Guten Abend"],
      ["Good night", "Gute Nacht"],
      ["Hello", "Hallo"],
      ["Bye", "Tschüss"],
      ["Thanks", "Danke"],
      ["Yes", "Ja"],
      ["No", "Nein"],
      ["Please", "Bitte"],
    ],
  },
  default: {
    language: "Local",
    sample: "Hello",
    phrases: [
      ["Good morning", "Hello"],
      ["Good day", "Good day"],
      ["Good evening", "Good evening"],
      ["Good night", "Good night"],
      ["Hello", "Hello"],
      ["Bye", "Bye"],
      ["Thanks", "Thanks"],
      ["Yes", "Yes"],
      ["No", "No"],
      ["Please", "Please"],
    ],
  },
};

function getTimeAwareGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

function getFirstName(name = "Thomas") {
  return String(name || "Thomas").trim().split(/\s+/)[0] || "Thomas";
}

function getLocalGlossaryForTrip(trip = {}) {
  const key = getGlossaryKeyForTrip(trip);
  const glossary = LOCAL_GLOSSARIES[key] || LOCAL_GLOSSARIES.default;
  return {
    ...glossary,
    phrases: glossary.phrases.map(([en, local]) => ({ en, local })),
  };
}

function getGlossaryKeyForTrip(trip = {}) {
  const haystack = `${trip.destination || ""} ${trip.flag || ""}`.toLowerCase();
  if (haystack.includes("france") || haystack.includes("paris") || haystack.includes("lyon") || haystack.includes("nice") || haystack.includes("🇫🇷")) return "france";
  if (haystack.includes("greece") || haystack.includes("crete") || haystack.includes("athens") || haystack.includes("santorini") || haystack.includes("🇬🇷")) return "greece";
  if (haystack.includes("spain") || haystack.includes("barcelona") || haystack.includes("madrid") || haystack.includes("seville") || haystack.includes("🇪🇸")) return "spain";
  if (haystack.includes("uk") || haystack.includes("united kingdom") || haystack.includes("london") || haystack.includes("edinburgh") || haystack.includes("england") || haystack.includes("scotland") || haystack.includes("🇬🇧")) return "uk";
  if (haystack.includes("japan") || haystack.includes("tokyo") || haystack.includes("kyoto") || haystack.includes("osaka") || haystack.includes("🇯🇵")) return "japan";
  if (haystack.includes("sweden") || haystack.includes("stockholm") || haystack.includes("gothenburg") || haystack.includes("🇸🇪")) return "sweden";
  if (haystack.includes("italy") || haystack.includes("rome") || haystack.includes("venice") || haystack.includes("milan") || haystack.includes("florence") || haystack.includes("🇮🇹")) return "italy";
  if (haystack.includes("germany") || haystack.includes("berlin") || haystack.includes("munich") || haystack.includes("frankfurt") || haystack.includes("🇩🇪")) return "germany";
  return "default";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeHref(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderHomeAiConciergeCard(trip) {
  if (!state.canShowConciergeAndAssistant) return "";

  const cityName = (trip.destination || "Destination").split(",")[0].trim();
  const weatherStr = trip.weather?.condition ? `${trip.weather.condition} • ${trip.weather.temp || ""}` : "";
  const poiCount = [...(trip.tourismPois || []), ...(trip.hiddenGems || []), ...(trip.osmPlaces || [])].length;

  return `
    <section class="home-section home-ai-concierge-card mb-lg" style="background: linear-gradient(135deg, rgba(217, 74, 58, 0.08) 0%, rgba(56, 92, 115, 0.12) 100%); border: 1px solid rgba(217, 74, 58, 0.22); border-radius: 16px; padding: 20px; margin-bottom: 24px; position: relative; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="ai-badge voice-mono" style="background: var(--journey-red); color: white; padding: 4px 9px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.5px;">
            ${renderIcon("sparkles")} TRIP CONCIERGE
          </span>
          <span style="font-size: 0.78rem; color: var(--ink-muted); font-weight: 500;">
            ${poiCount > 0 ? `${poiCount} local spots indexed` : "Live destination intelligence"}
          </span>
        </div>
        <button class="btn btn--outline btn--xs" data-action="toggle-ai-concierge" type="button" style="border-color: var(--journey-red); color: var(--journey-red); font-weight: 600; font-size: 0.78rem; padding: 4px 10px; border-radius: 14px;">
          Open Drawer ${renderIcon("arrowRight")}
        </button>
      </div>

      <h3 class="voice-serif" style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin: 0 0 6px 0;">
        Ask anything about ${escapeHtml(cityName)}
      </h3>
      <p style="font-size: 0.84rem; color: var(--ink-muted); margin: 0 0 16px 0; line-height: 1.45;">
        Get instant, location-aware answers powered by Cloudflare Workers AI and live local data${weatherStr ? ` • ${escapeHtml(weatherStr)}` : ""}.
      </p>

      <form class="home-concierge-quick-form" data-action="submit-home-concierge-form" onsubmit="return false;" style="display: flex; gap: 8px; margin-bottom: 14px;">
        <input type="text" id="home-concierge-input" placeholder="e.g. Best coffee, rainy day plan, hidden gems in ${escapeHtml(cityName)}..." style="flex: 1; border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; font-size: 0.88rem; background: var(--paper); color: var(--ink);" required />
        <button class="btn btn--primary btn--sm" type="submit" style="white-space: nowrap; font-weight: 600; padding: 10px 16px; border-radius: 10px;">
          Ask AI ${renderIcon("sparkles")}
        </button>
      </form>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Best specialty coffee spots in ${escapeHtml(cityName)}">☕ Coffee in ${escapeHtml(cityName)}</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="What should I do on a rainy day in ${escapeHtml(cityName)}?">☔ Rainy day plan</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Hidden local gems in ${escapeHtml(cityName)} away from crowds">🌿 Hidden gems</button>
        <button class="ai-chip" data-action="send-ai-chip" data-prompt="Top evening dining & wine bars in ${escapeHtml(cityName)}">🍷 Dining & Wine</button>
      </div>
    </section>
  `;
}

function renderSignedOutWelcomeHero() {
  return `
    <div class="home-page">
      ${renderHeader()}

      <div class="home-page__content">
        <section class="signed-out-welcome-hero animate-scale-up">
          <div class="signed-out-welcome-badge voice-mono">
            ${renderIcon("sparkles")} TRIP TRAVEL CONCIERGE & JOURNAL
          </div>
          <h1 class="signed-out-welcome-title voice-serif">
            Plan and remember your journeys.
          </h1>
          <p class="signed-out-welcome-subhead">
            Build interactive itineraries, discover local specialty coffee & hidden gems, track live route maps, and capture travel moments in one place.
          </p>
          <div class="signed-out-welcome-actions">
            <button class="btn btn--primary btn--lg" data-action="open-trip-create" type="button">
              ${renderIcon("sparkles")} Create Guest Draft Trip
            </button>
            <button class="btn btn--outline btn--lg" data-action="show-auth-exit" data-auth-mode="signup" type="button">
              ${renderIcon("userPlus")} Sign Up / Sign In
            </button>
          </div>
          
          <div class="signed-out-features-grid">
            <div class="signed-out-feature-card">
              <div class="signed-out-feature-icon">${renderIcon("map")}</div>
              <strong>Live Route & Maps</strong>
              <p>Explore city maps, airports, and local discovery spots.</p>
            </div>
            <div class="signed-out-feature-card">
              <div class="signed-out-feature-icon">${renderIcon("sparkles")}</div>
              <strong>Multi-LLM AI Concierge</strong>
              <p>Query Workers AI, DeepSeek R1, Gemini, ChatGPT & Grok.</p>
            </div>
            <div class="signed-out-feature-card">
              <div class="signed-out-feature-icon">${renderIcon("camera")}</div>
              <strong>Moments & Journal</strong>
              <p>Capture photos, notes, and auto-generate AI stories.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;
}
