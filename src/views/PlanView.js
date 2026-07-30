import { state } from "../state.js";
import { renderCalendarGrid } from "../components/CalendarGrid.js";
import { renderHeader } from "../components/Header.js";
import { renderIcon } from "../utils/icons.js";
import { TRIP_STAMP_SVG } from "../components/BrandAssets.js";
import { calculateFlightDistance, formatAirportLabel, getFlightRouteDisplay } from "../services/airportService.js";
import { getDestinationTransitGuide } from "../services/transitService.js";
import { FLIGHT_TYPE_OPTIONS, getFlightRouteForTrip } from "../services/flightService.js";
import { CONCERTS_DATABASE } from "../services/concertService.js";
import { composeEditorialProfile, createVerifiedFactBundle } from "../enrichment/editorialComposer.js";

const SUB_TABS = [
  { id: "overview", label: "Overview", icon: renderIcon("compass") },
  { id: "transit", label: "Transit", icon: renderIcon("navigation") },
  { id: "explore", label: "Explore", icon: renderIcon("sparkles") },
  { id: "plan", label: "Plan", icon: renderIcon("calendar") }
];

const JOURNAL_SECTIONS = [
  { id: "gallery", label: "Gallery", icon: renderIcon("image") },
  { id: "notes", label: "Notes", icon: renderIcon("fileText") },
  { id: "story", label: "Story", icon: renderIcon("bookOpen") },
  { id: "templates", label: "Templates", icon: renderIcon("save") }
];

const TEMPLATE_FILTERS = [
  { id: "all", label: "All" },
  { id: "moments", label: "Moments" },
  { id: "stories", label: "Stories" },
  { id: "guides", label: "Guides" },
  { id: "videos", label: "Videos" },
  { id: "prints", label: "Prints" },
];

const VIEW_MODES = [
  { id: "day", label: "Day", icon: renderIcon("calendar") },
  { id: "week", label: "Week", icon: renderIcon("calendar") },
  { id: "timeline", label: "Timeline", icon: renderIcon("clock") },
  { id: "map", label: "Map", icon: renderIcon("map") }
];

const DAYS_HEADER = ["Sat 3 Oct", "Sun 4 Oct", "Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Thu 8 Oct", "Fri 9 Oct"];

export function renderPlanView() {
  const trip = state.activeTrip;
  const activeSubTab = state.planSubTab === "story" ? "journal" : state.planSubTab;
  const isJournalMode = activeSubTab === "journal";
  const activeJournalSection = state.journalSection || "gallery";
  const navItems = isJournalMode ? JOURNAL_SECTIONS : SUB_TABS;

  return `
    <div class="plan-page">
      <!-- Universal Top App Header -->
      ${renderHeader()}

      <div class="plan-page-body" style="padding: 0 16px;">
        <!-- Primary Sub-Navigation Bar -->
        <nav class="sub-tab-nav ${isJournalMode ? "sub-tab-nav--journal" : ""}">
          ${navItems.map(
            (tab) => `
              <button class="sub-tab-item ${(isJournalMode ? activeJournalSection : activeSubTab) === tab.id ? 'is-active' : ''}" ${isJournalMode ? `data-journal-section="${tab.id}"` : `data-subtab="${tab.id}"`}>
                <span class="sub-tab-icon">${tab.icon}</span>
                <span class="sub-tab-label">${tab.label}</span>
              </button>
            `
          ).join("")}
        </nav>

        <!-- Subtab Specific Content Render -->
        <div class="subtab-content-container">
          ${renderSubtabContent(trip)}
        </div>
      </div>
    </div>
  `;
}

function renderSubtabContent(trip) {
  const tab = state.planSubTab === "story" ? "journal" : state.planSubTab;

  if (tab === "overview") {
    return renderOverviewSubTab(trip);
  }
  if (tab === "explore") {
    return renderExploreSubTab(trip);
  }
  if (tab === "transit") {
    return renderTransitSubTab(trip);
  }
  if (tab === "journal") {
    return renderJournalSubTab();
  }
  // Default "plan" / "explore" layout with View Mode controls
  return `
    <!-- View Mode Switcher Pills -->
    <div class="view-mode-bar">
      <div class="view-mode-pills-group">
        ${VIEW_MODES.map(
          (mode) => `
            <button class="view-mode-pill ${state.planViewMode === mode.id ? 'is-active' : ''}" data-viewmode="${mode.id}">
              <span class="pill-icon">${mode.icon}</span>
              <span class="pill-text">${mode.label}</span>
            </button>
          `
        ).join("")}
      </div>
    </div>

    <!-- Content Area (Calendar Grid or Vertical Timeline/Map) -->
    <main class="plan-content-area">
      ${state.planViewMode === "week" ? renderCalendarGrid({ mode: "week" }) : renderAlternativePlanView(trip)}
    </main>
  `;
}

function renderJournalSubTab() {
  const moments = getMomentsForTrip(state.activeTrip.id);
  const allMediaMoments = moments.filter(hasUsableMediaMoment);
  const mediaMoments = filterJournalMediaMoments(allMediaMoments);
  const noteMoments = moments.filter(isWrittenNoteMoment);
  const mediaGroups = groupMediaMoments(mediaMoments);
  const section = state.journalSection || "gallery";

  return `
    <div class="journal-subtab-view" style="padding: 8px 4px 24px 4px;">
      <div class="journal-header mb-md">
        <h2 style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-bottom: 4px;">Travel Moments & Media</h2>
        <p style="font-size: 0.85rem; color: var(--ink-muted); margin: 0;">Captured photos, videos, and personal notes from ${escapeHtml(state.activeTrip.destination)}</p>
      </div>

      ${section === "notes" ? renderJournalNotesSection(noteMoments) : ""}
      ${section === "story" ? renderStorySubTab(state.activeTrip) : ""}
      ${section === "templates" ? renderJournalTemplatesSection(state.activeTrip, { mediaCount: allMediaMoments.length, noteCount: noteMoments.length }) : ""}
      ${section === "gallery" ? renderJournalGallerySection(mediaGroups, mediaMoments.length) : ""}
    </div>
  `;
}

function renderJournalGallerySection(mediaGroups, mediaCount) {
  const filterLabel = state.journalMediaFilter === "photos" ? "Photos" : state.journalMediaFilter === "videos" ? "Videos" : "Filter";
  const queryLabel = state.journalMediaQuery ? `Search: ${state.journalMediaQuery}` : "Search moments";
  return `
    <section class="journal-section-panel" aria-labelledby="journal-gallery-title">
      <div class="journal-section-header">
        <div>
          <span class="voice-mono">Your moments</span>
          <h3 id="journal-gallery-title">Gallery</h3>
          <p class="journal-section-subcopy">${mediaCount} ${mediaCount === 1 ? "moment" : "moments"} from this trip</p>
        </div>
        <div class="journal-section-actions">
          <button class="journal-icon-action" data-action="search-journal-media" type="button" aria-label="${escapeHtml(queryLabel)}" title="${escapeHtml(queryLabel)}">${renderIcon("search")}</button>
          <button class="btn btn--outline btn--sm" data-action="cycle-journal-media-filter" type="button">${renderIcon("filter")} ${escapeHtml(filterLabel)}</button>
          <button class="btn btn--primary btn--sm" data-action="open-quick-capture" type="button">${renderIcon("plus")} New moment</button>
        </div>
      </div>
      <div class="journal-media-grid mb-lg" style="margin-bottom: 24px;">
        ${mediaCount === 0 ? renderEmptyJournalMediaCard() : mediaGroups.map(renderJournalMediaGroup).join("")}
      </div>
    </section>
  `;
}

function filterJournalMediaMoments(mediaMoments = []) {
  const filter = state.journalMediaFilter || "all";
  const query = String(state.journalMediaQuery || "").trim().toLowerCase();
  return mediaMoments.filter((moment) => {
    const type = String(moment.type || "photo").toLowerCase();
    const matchesType = filter === "all" || (filter === "photos" && type !== "video") || (filter === "videos" && type === "video");
    if (!matchesType) return false;
    if (!query) return true;
    const haystack = [
      moment.title,
      moment.placeTitle,
      moment.placeCategory,
      moment.geoLabel,
      ...(moment.tags || []),
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function renderEmptyJournalMediaCard() {
  return `
    <div class="empty-media-card" style="background: var(--paper-card); border: 1px dashed var(--line); border-radius: var(--radius-lg); padding: 32px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--paper-subtle); display: flex; align-items: center; justify-content: center; color: var(--ink-muted); margin-bottom: 4px;">
        ${renderIcon("camera")}
      </div>
      <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--ink); margin: 0;">No photos or videos captured yet</h4>
      <p style="font-size: 0.82rem; color: var(--ink-muted); margin: 0; max-width: 320px; line-height: 1.4;">Use Quick Capture to record photos, videos, and journey notes for this trip.</p>
      <button class="btn btn--primary btn--sm" data-action="open-quick-capture" type="button" style="margin-top: 8px;">
        ${renderIcon("camera")} Open Quick Capture
      </button>
    </div>
  `;
}

function renderJournalNotesSection(noteMoments) {
  return `
    <section class="journal-section-panel journal-notes-section" aria-labelledby="journal-notes-title">
      <div class="journal-section-header">
        <div>
          <span class="voice-mono">Written moments</span>
          <h3 id="journal-notes-title">Notes</h3>
        </div>
        <button class="btn btn--outline btn--sm" data-action="open-quick-capture" type="button">${renderIcon("plus")} Add note</button>
      </div>
      <div class="notes-feed" style="display: flex; flex-direction: column; gap: 10px;">
        ${noteMoments.length === 0 ? `
          <p style="font-size: 0.85rem; color: var(--ink-muted); font-style: italic;">No personal notes written yet.</p>
        ` : noteMoments.map(renderJournalNoteCard).join('')}
      </div>
    </section>
  `;
}

function renderJournalNoteCard(m) {
  return `
    <div class="note-card" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 14px 16px; box-shadow: var(--shadow-sm); display: flex; gap: 12px; align-items: flex-start;">
      <div style="color: var(--blue); margin-top: 2px;">
        ${renderIcon("fileText")}
      </div>
      <div class="note-body" style="flex: 1;">
        <h4 class="note-title" style="font-size: 0.92rem; font-weight: 700; color: var(--ink); margin: 0 0 4px 0;">${escapeHtml(m.title)}</h4>
        <p class="note-text" style="font-size: 0.85rem; color: var(--ink-muted); margin: 0 0 6px 0; line-height: 1.4;">${escapeHtml(m.text)}</p>
        <span class="note-date voice-mono" style="font-size: 0.72rem; color: var(--ink-light);">${escapeHtml(m.date || "")}</span>
      </div>
    </div>
  `;
}

function renderJournalTemplatesSection(trip, counts = {}) {
  const templates = getJournalTemplates(trip, counts);
  const activeFilter = state.journalTemplateFilter || "all";
  const visibleTemplates = activeFilter === "all" ? templates : templates.filter((template) => template.filter === activeFilter);

  return `
    <section class="journal-section-panel" aria-labelledby="journal-templates-title">
      <div class="journal-section-header">
        <div>
          <span class="voice-mono">Choose a template</span>
          <h3 id="journal-templates-title">Templates</h3>
          <p class="journal-section-subcopy">Start from a beautiful layout and make it your own.</p>
        </div>
      </div>
      <div class="journal-template-filters" role="tablist" aria-label="Template categories">
        ${TEMPLATE_FILTERS.map((filter) => `
          <button class="journal-template-filter ${activeFilter === filter.id ? "is-active" : ""}" data-template-filter="${filter.id}" type="button" role="tab" aria-selected="${activeFilter === filter.id}">
            ${escapeHtml(filter.label)}
          </button>
        `).join("")}
      </div>
      <div class="journal-template-grid">
        ${visibleTemplates.map((template) => `
          <button class="journal-template-card" data-action="open-template-picker" data-template="${escapeHtml(template.id)}" type="button">
            <span class="journal-template-card__media" style="background-image: url('${escapeHtml(template.image)}');">
              <span>${renderIcon(template.icon)}</span>
            </span>
            <span class="journal-template-card__body">
              <strong>${escapeHtml(template.title)}</strong>
              <small>${escapeHtml(template.detail)}</small>
            </span>
          </button>
        `).join("") || `<p class="journal-empty-inline">No templates in this category yet.</p>`}
      </div>
    </section>
  `;
}

function getJournalTemplates(trip, counts = {}) {
  const previewImages = getTemplatePreviewImages(trip);
  return [
    { id: "share-card", filter: "moments", title: "Postcard", detail: "Share a quick moment", pickerHint: "Pick one strong cover moment.", min: 1, max: 1, icon: "share", image: previewImages[0] },
    { id: "day-recap", filter: "stories", title: "Day Story", detail: "Your day in a beautiful summary", pickerHint: "Choose moments from the day you want to recap.", min: 1, max: 6, icon: "calendar", image: previewImages[1] },
    { id: "photo-essay", filter: "stories", title: "Photo Essay", detail: `${counts.mediaCount || 0} media items ready`, pickerHint: "Pick 4-8 moments for the visual sequence.", min: 3, max: 8, icon: "image", image: previewImages[2] },
    { id: "city-guide", filter: "guides", title: "City Guide", detail: `Create your ${trip.destination.split(",")[0]} guide`, pickerHint: "Choose place-defining moments for the guide.", min: 1, max: 6, icon: "map", image: previewImages[3] },
    { id: "food-journal", filter: "moments", title: "Food Journal", detail: "Document cafés, meals and wine", pickerHint: "Pick food, coffee and wine moments.", min: 1, max: 6, icon: "utensils", image: previewImages[4] },
    { id: "travel-film", filter: "videos", title: "Travel Film", detail: "Cinematic edits from moments", pickerHint: "Choose video clips or motion-friendly images.", min: 1, max: 10, icon: "video", image: previewImages[5] },
    { id: "route-story", filter: "guides", title: "Route Story", detail: "Map the journey with context", pickerHint: "Choose moments that mark route stops.", min: 1, max: 8, icon: "route", image: previewImages[6] },
    { id: "travel-log", filter: "prints", title: "Trip Book", detail: `${counts.noteCount || 0} notes available`, pickerHint: "Choose the moments that belong in the book.", min: 1, max: 12, icon: "bookOpen", image: previewImages[7] },
  ];
}

function getTemplatePreviewImages(trip) {
  const ideaImages = (trip.ideas || []).map((idea) => idea.image).filter(Boolean);
  const mediaImages = getMomentsForTrip(trip.id).filter(hasUsableMediaMoment).map(getMomentMediaUrl).filter(Boolean);
  const fallbackImages = [
    trip.upcomingActivity?.image,
    ...ideaImages,
    ...mediaImages,
    "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=900&q=82",
  ].filter(Boolean);

  return Array.from({ length: 8 }, (_, index) => fallbackImages[index % fallbackImages.length]);
}

export function renderTemplateMomentPicker(trip) {
  const picker = state.activeTemplatePicker;
  if (!picker) return "";

  const allMediaMoments = getMomentsForTrip(trip.id).filter(hasUsableMediaMoment);
  const templates = getJournalTemplates(trip, { mediaCount: allMediaMoments.length, noteCount: getMomentsForTrip(trip.id).filter(isWrittenNoteMoment).length });
  const template = templates.find((item) => item.id === picker.templateId) || templates[0];
  const selected = new Set(picker.selectedMomentIds || []);
  const selectedCount = selected.size;
  const hasMoments = allMediaMoments.length > 0;
  const canCreate = hasMoments && selectedCount > 0;

  return `
    <div class="template-picker-overlay" data-action="close-template-picker" role="presentation">
      <section class="template-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="template-picker-title" data-action="template-picker-sheet">
        <div class="template-picker-header">
          <div>
            <span class="voice-mono">Choose moments</span>
            <h3 id="template-picker-title">${escapeHtml(template.title)}</h3>
            <p>${escapeHtml(template.pickerHint || "Pick the moments you want this template to use.")}</p>
          </div>
          <button class="journal-icon-action" data-action="close-template-picker" type="button" aria-label="Close picker">${renderIcon("x")}</button>
        </div>

        <div class="template-picker-summary">
          <span>${renderIcon(template.icon)} ${escapeHtml(template.title)}</span>
          <strong>${selectedCount} selected</strong>
          <small>${template.max ? `Up to ${template.max}` : "Choose any"}</small>
        </div>

        ${hasMoments ? `
          <div class="template-picker-grid">
            ${allMediaMoments.map((moment) => renderTemplatePickerMoment(moment, selected.has(moment.id), template)).join("")}
          </div>
        ` : `
          <div class="template-picker-empty">
            <span>${renderIcon("camera")}</span>
            <h4>No gallery moments yet</h4>
            <p>Capture or upload photos first, then come back to make this template yours.</p>
            <button class="btn btn--primary btn--sm" data-action="open-quick-capture" type="button">${renderIcon("camera")} Open Quick Capture</button>
          </div>
        `}

        <div class="template-picker-actions">
          <button class="btn btn--outline btn--sm" data-action="template-picker-select-recommended" type="button" ${hasMoments ? "" : "disabled"}>${renderIcon("sparkles")} Recommended</button>
          <button class="btn btn--outline btn--sm" data-action="template-picker-clear" type="button" ${selectedCount ? "" : "disabled"}>${renderIcon("x")} Clear</button>
          <button class="btn btn--primary btn--sm" data-action="confirm-template-picker" type="button" ${canCreate ? "" : "disabled"}>${renderIcon("sparkles")} Create</button>
        </div>
      </section>
    </div>
  `;
}

function renderTemplatePickerMoment(moment, isSelected, template) {
  const mediaUrl = getMomentMediaUrl(moment);
  const isVideo = String(moment.type || "").toLowerCase() === "video" || mediaUrl.includes("data:video");
  const disabled = !isSelected && template.max && (state.activeTemplatePicker?.selectedMomentIds || []).length >= template.max;
  return `
    <button class="template-picker-moment ${isSelected ? "is-selected" : ""}" data-action="toggle-template-picker-moment" data-moment-id="${escapeHtml(moment.id)}" type="button" ${disabled ? "disabled" : ""}>
      <span class="template-picker-moment__image" style="background-image: url('${escapeHtml(mediaUrl)}');">
        ${isVideo ? `<span class="template-picker-moment__play">${renderIcon("play")}</span>` : ""}
        <span class="template-picker-moment__check">${isSelected ? renderIcon("check") : renderIcon("plus")}</span>
      </span>
      <span class="template-picker-moment__body">
        <strong>${escapeHtml(moment.title || "Trip Moment")}</strong>
        <small>${escapeHtml(moment.placeTitle || moment.geoLabel || moment.date || "")}</small>
      </span>
    </button>
  `;
}

function groupMediaMoments(mediaMoments = []) {
  const groups = new Map();
  mediaMoments.forEach((moment) => {
    const key = moment.groupId || moment.id;
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        title: moment.groupTitle || moment.groupPlaceTitle || moment.placeTitle || "Media",
        date: moment.groupCapturedAt || moment.date || "",
        geoLabel: moment.groupGeoLabel || moment.geoLabel || "",
        placeTitle: moment.groupPlaceTitle || moment.placeTitle || "",
        category: moment.groupCategory || moment.placeCategory || "",
        moments: [],
      });
    }
    groups.get(key).moments.push(moment);
  });
  return Array.from(groups.values());
}

function renderJournalMediaGroup(group) {
  const isBatch = group.moments.length > 1;
  const meta = [
    group.placeTitle || group.geoLabel,
    group.category,
    isBatch ? `${group.moments.length} items` : "",
  ].filter(Boolean).join(" · ");

  return `
    <section class="journal-media-group ${isBatch ? 'is-batch' : ''}">
      ${isBatch ? `
        <div class="journal-media-group__header">
          <div>
            <h3>${escapeHtml(group.title || "Media batch")}</h3>
            <p>${escapeHtml(meta || "Grouped by upload time")}</p>
          </div>
          <span class="voice-mono">${escapeHtml(formatJournalGroupDate(group.date))}</span>
        </div>
      ` : ""}
      <div class="journal-media-group__grid">
        ${group.moments.map(renderJournalMediaCard).join("")}
      </div>
    </section>
  `;
}

function renderJournalMediaCard(m) {
  const mediaUrl = getMomentMediaUrl(m);
  const isVideo = m.type === "video" || mediaUrl.includes("data:video");
  const likes = 20 + Math.abs(String(m.id || "").length % 9);
  const notes = Math.max(1, (m.tags || []).length);
  return `
    <div class="journal-media-card" data-action="open-lightbox" data-moment-id="${m.id}">
      <div class="journal-media-thumb ${mediaUrl ? "" : "journal-media-thumb--missing"}" style="${mediaUrl ? `background-image: url('${escapeHtml(mediaUrl)}');` : ""}">
        ${mediaUrl ? "" : `
          <div class="journal-media-missing">
            ${renderIcon(m.type === "video" ? "video" : "camera")}
            <span>Media unavailable on this device</span>
          </div>
        `}
        <span class="media-type-badge voice-mono" style="position: absolute; bottom: 6px; right: 6px; background: rgba(23,24,23,0.8); color: #fff; padding: 2px 8px; border-radius: var(--radius-pill); font-size: 0.68rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
          ${isVideo ? renderIcon("video") : renderIcon("camera")} ${escapeHtml(m.type || "photo")}
        </span>
        ${isVideo ? `<span class="journal-media-play">${renderIcon("play")}</span>` : ""}
        ${m.groupFileCount > 1 ? `
          <span class="journal-media-batch-badge voice-mono">${escapeHtml(String(m.groupFileCount))} batch</span>
        ` : ""}
        ${m.adminDemo ? "" : `<button class="journal-media-edit-btn" data-action="edit-journal-media" data-moment-id="${m.id}" title="Edit place tags" aria-label="Edit place tags">${renderIcon("pencil")}</button>`}
      </div>
      <div class="journal-media-body" style="padding: 10px;">
        <h4 class="journal-media-title" style="font-size: 0.85rem; font-weight: 700; margin: 0 0 2px 0; color: var(--ink);">${escapeHtml(m.title || 'Trip Moment')}</h4>
        <p class="journal-media-date voice-mono" style="font-size: 0.72rem; color: var(--ink-muted); margin: 0;">${escapeHtml(m.date || 'Oct 2026')}</p>
        ${renderMomentTags(m)}
      </div>
      <div class="journal-media-stats" aria-hidden="true">
        <span>${renderIcon("heart")} ${likes}</span>
        <span>${renderIcon("messageCircle")} ${notes}</span>
      </div>
    </div>
  `;
}

function formatJournalGroupDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderStorySubTab(trip) {
  const generated = state.generatedStories ? state.generatedStories[trip.id] : null;
  const moments = getMomentsForTrip(trip.id);
  const mediaMoments = moments.filter(hasUsableMediaMoment);
  const selectedStoryMediaIds = new Set(generated?.selectedMomentIds || []);
  const storyMediaMoments = selectedStoryMediaIds.size ? mediaMoments.filter((moment) => selectedStoryMediaIds.has(moment.id)) : mediaMoments;
  const noteMoments = moments.filter(isWrittenNoteMoment);
  const authorName = getStoryAuthorName();

  return `
    <div class="story-subtab-view">
      <!-- AI Editorial Action Header Bar -->
      <div class="story-ai-header mb-md" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm);">
        <div>
          <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--red); letter-spacing: 0.5px;">AI NARRATIVE JOURNAL</span>
          <h3 style="font-size: 1.05rem; font-weight: 700; margin: 2px 0 0 0; color: var(--ink);">${escapeHtml(generated?.templateLabel || '"Every place becomes a story"')}</h3>
        </div>
        <button class="btn btn--primary btn--sm" data-action="generate-ai-story" data-template="ai-story">
          ${renderIcon("sparkles")} ${generated ? 'Regenerate AI Story' : 'Generate AI Story'}
        </button>
      </div>

      <article class="editorial-story-card">
        <div class="story-cover" style="background-image: url('${trip.upcomingActivity.image}')">
          <div class="story-cover-overlay"></div>
          <div class="story-cover-content">
            <span class="story-kicker">${escapeHtml(generated?.kicker || "EDITORIAL TRAVEL ARCHIVE")}</span>
            <h1 class="story-main-title" style="display: flex; align-items: center; gap: 8px;">
              <span contenteditable="true" data-story-field="title" style="outline: none;" title="Click to edit title">${escapeHtml(generated?.title || `${trip.destination} ${trip.flag}`)}</span>
              <span style="opacity: 0.5; font-size: 0.8rem; display: inline-flex; align-items: center;" title="Click text to edit">${renderIcon("pencil")}</span>
            </h1>
            <p class="story-byline">By ${escapeHtml(authorName)} • ${escapeHtml(trip.dates)} ${generated ? '• Powered by Worker AI Engine' : ''}</p>
          </div>
        </div>

        <div class="story-prose">
          <div style="position: relative; margin-bottom: 20px;">
            <p class="story-lead" contenteditable="true" data-story-field="lead" style="outline: none; margin: 0; padding-right: 28px;" title="Click to edit lead paragraph">
              ${escapeHtml(generated?.lead || generated?.summary || `Every place becomes a story. Exploring ${trip.destination} brought together historic architecture, specialty coffee roasters, and unforgettable moments along the journey.`)}
            </p>
            <span style="position: absolute; top: 2px; right: 0; opacity: 0.45; font-size: 0.8rem; display: inline-flex; align-items: center; pointer-events: none;">${renderIcon("pencil")}</span>
          </div>

          ${generated?.sections ? generated.sections.map((sec, idx) => `
            <div style="position: relative; margin-top: 20px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <h3 class="story-h3" contenteditable="true" data-story-sec-title="${idx}" style="font-size: 1.2rem; font-weight: 700; color: var(--ink); outline: none; margin: 0;" title="Click to edit heading">${escapeHtml(sec.title || sec.heading)}</h3>
                <span style="opacity: 0.45; font-size: 0.75rem; display: inline-flex; align-items: center; pointer-events: none;">${renderIcon("pencil")}</span>
              </div>
              <p contenteditable="true" data-story-sec-body="${idx}" style="font-size: 0.95rem; line-height: 1.6; color: var(--ink-muted); outline: none; margin: 0;" title="Click to edit content">${escapeHtml(sec.body || sec.content)}</p>
            </div>
          `).join('') : ''}

          <h3 class="story-h3" style="margin-top: 24px;">Highlights of the Journey</h3>
          <ul class="story-highlights-list">
            ${(trip.ideas || []).map(idea => `
              <li class="story-highlight-item">
                <strong>${escapeHtml(idea.title)}</strong>: ${escapeHtml(idea.subtitle)} (★ ${idea.rating})
              </li>
            `).join('')}
          </ul>

          <h3 class="story-h3" style="margin-top: 24px;">Captured Media</h3>
          ${storyMediaMoments.length ? `
            <div class="story-media-strip">
              ${storyMediaMoments.slice(0, 8).map(renderStoryMediaMemory).join("")}
            </div>
          ` : `
            <div class="story-empty-memory">
              <span>${renderIcon("camera")}</span>
              <p>No photos or videos captured for this trip yet.</p>
              <button class="btn btn--outline btn--sm" data-action="open-quick-capture" type="button">${renderIcon("camera")} Capture now</button>
            </div>
          `}

          <h3 class="story-h3" style="margin-top: 24px;">Personal Notes</h3>
          <div class="story-moments-list">
            ${noteMoments.length ? noteMoments.map(m => renderStoryNoteMemory(m)).join("") : `
              <div class="story-empty-memory">
                <span>${renderIcon("fileText")}</span>
                <p>No written notes for this trip yet.</p>
                <button class="btn btn--outline btn--sm" data-action="open-quick-capture" type="button">${renderIcon("plus")} Add note</button>
              </div>
            `}
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderStoryMediaMemory(moment) {
  const mediaUrl = getMomentMediaUrl(moment);
  return `
    <button class="story-media-memory ${mediaUrl ? "" : "is-missing"}" data-action="open-lightbox" data-moment-id="${escapeHtml(moment.id)}" type="button">
      ${mediaUrl ? `
        <span class="story-media-memory__image" style="background-image: url('${escapeHtml(mediaUrl)}');"></span>
      ` : `
        <span class="story-media-memory__missing">${renderIcon(moment.type === "video" ? "video" : "camera")}</span>
      `}
      <span class="story-media-memory__copy">
        <strong>${escapeHtml(moment.title || "Captured media")}</strong>
        <small>${escapeHtml(moment.placeTitle || moment.geoLabel || moment.date || "")}</small>
      </span>
    </button>
  `;
}

function renderStoryNoteMemory(moment) {
  return `
    <blockquote class="story-quote" style="position: relative;">
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
        <p contenteditable="true" data-story-moment-id="${moment.id}" style="outline: none; margin: 0; flex: 1;" title="Click to edit note">"${escapeHtml(moment.text || moment.title)}"</p>
        <span style="opacity: 0.45; font-size: 0.75rem; display: inline-flex; align-items: center; pointer-events: none; margin-top: 2px;">${renderIcon("pencil")}</span>
      </div>
      <cite>— Recorded on ${escapeHtml(moment.date || "")}</cite>
    </blockquote>
  `;
}

function getStoryAuthorName() {
  const isSignedIn = ["admin", "traveler"].includes(state.userSession?.role);
  return isSignedIn ? (state.userProfile?.name || "Traveler") : "TRIP";
}

function renderAlternativePlanView() {
  const mode = state.planViewMode;
  const trip = state.activeTrip;
  const events = trip.calendarEvents || [];

  if (mode === "day") {
    return `
      <div class="day-schedule-view">
        ${renderCalendarGrid({ mode: "day" })}
      </div>
    `;
  }

  if (mode === "map") {
    const activeDay = state.mapDayFilter;
    const hasDayFilter = activeDay !== null && activeDay !== undefined;
    const visibleEvents = hasDayFilter ? events.filter((event) => Number(event.dayIndex) === activeDay) : events;
    return `
      <div class="plan-map-view">
        <div class="plan-map-header">
          <div>
            <h3 class="plan-map-title">Itinerary map</h3>
            <p class="plan-map-subtitle">${hasDayFilter ? `Day ${activeDay + 1}` : "All days"} · ${visibleEvents.length} calendar activities plotted</p>
          </div>
          <button class="btn btn--outline btn--sm" data-viewmode="timeline">${renderIcon("clock")} Timeline</button>
        </div>
        <div class="plan-map-day-filter ${hasDayFilter ? '' : 'is-all-days'}" aria-label="Filter map by day">
          ${DAYS_HEADER.map((dayStr, idx) => `
            <button class="plan-map-day-pill ${hasDayFilter && activeDay === idx ? 'is-active' : ''}" data-map-day-filter="${idx}" aria-pressed="${hasDayFilter && activeDay === idx ? 'true' : 'false'}">
              <span class="pill-day-name">${dayStr.split(' ')[0]}</span>
              <span class="pill-day-num">${dayStr.split(' ')[1]}</span>
            </button>
          `).join('')}
        </div>
        <div class="plan-map-shell">
          <div id="plan-map-container" class="plan-map"></div>
          ${visibleEvents.length ? "" : `
            <div class="plan-map-empty">
              <strong>${hasDayFilter ? `No activities on Day ${activeDay + 1}` : "No activities yet"}</strong>
              <span>${hasDayFilter ? "Add an activity or pick another day." : "Add activities to start plotting your trip."}</span>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // Vertical Graphic Timeline view
  return renderVerticalTimeline(trip);
}

function renderVerticalTimeline(trip) {
  const events = trip.calendarEvents || [];
  const days = ["Sat 3 Oct", "Sun 4 Oct", "Mon 5 Oct", "Tue 6 Oct", "Wed 7 Oct", "Thu 8 Oct", "Fri 9 Oct"];

  return `
    <div class="vertical-timeline-container">
      <!-- Section 07 Brand Element: Dotted Route Line Header -->
      <div class="route-line-dashed-header mb-md" style="display: flex; align-items: center; justify-content: space-between; background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="route-node-pin">📍</span>
          <span class="voice-mono" style="font-size: 0.8rem; font-weight: 700; color: var(--ink);">${escapeHtml(trip.destination.toUpperCase())} ROUTE</span>
        </div>
        <span class="voice-mono" style="font-size: 0.72rem; color: var(--ink-muted);">${events.length} STOPS CONNECTED</span>
      </div>

      <div class="vertical-timeline-spine"></div>

      ${days.map((dayLabel, dayIdx) => {
        const dayEvents = events.filter((e) => Number(e.dayIndex) === dayIdx);
        return `
          <div class="timeline-day-group" data-day-index="${dayIdx}">
            <div class="timeline-day-node">
              <span class="timeline-day-badge">${renderIcon("pin")} Day ${dayIdx + 1} &bull; ${dayLabel}</span>
            </div>

            <div class="timeline-day-events">
              ${dayEvents.map((evt) => `
                <div class="timeline-event-row" data-action="open-edit-drawer" data-event-id="${evt.id}" data-day-index="${dayIdx}">
                  <div class="timeline-node-point">
                    <span class="timeline-node-dot timeline-dot--${evt.colorScheme || 'peach'}"></span>
                  </div>
                  
                  <div class="timeline-time-badge">${evt.startTime}</div>

                  <div class="timeline-card-box event-card--${evt.colorScheme || 'peach'}" data-event-id="${evt.id}">
                    <div class="timeline-card-grab" data-action="drag-timeline-event" data-event-id="${evt.id}" title="Move activity">${renderIcon("gripVertical")}</div>
                    <div class="timeline-card-header">
                      <h4 class="timeline-card-title">${escapeHtml(evt.title)}</h4>
                      <span class="timeline-duration-tag">${renderIcon("clock")} ${evt.startTime} – ${evt.endTime}</span>
                    </div>
                    ${evt.location ? `<div class="timeline-card-location">${renderIcon("pin")} ${escapeHtml(evt.location)}</div>` : ''}
                    ${evt.reminder && evt.reminder !== 'none' ? `<div class="timeline-card-reminder">${renderIcon("bell")} ${escapeHtml(evt.reminder)} before</div>` : ''}
                    <div class="timeline-card-actions">
                      <button class="btn btn--icon btn--ghost timeline-edit-btn" data-action="open-edit-drawer" data-event-id="${evt.id}" title="Edit activity" aria-label="Edit activity">${renderIcon("pencil")}</button>
                      <button class="btn btn--icon btn--ghost timeline-delete-btn" data-action="delete-calendar-event" data-event-id="${evt.id}" title="Delete activity" aria-label="Delete activity">${renderIcon("trash")}</button>
                    </div>
                  </div>
                </div>
              `).join('')}

              <button class="timeline-empty-slot" data-action="add-event-for-day" data-day-index="${dayIdx}">
                <span>${renderIcon("plus")} Add activity for ${dayLabel}</span>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderLocationEditorialIntroCard(trip) {
  const destination = trip.destination || "Destination";
  const area = trip.destination ? trip.destination.split(",")[0] : destination;
  const facts = createVerifiedFactBundle({
    title: destination,
    category: "City",
    area,
    coordinates: trip.center,
  });
  const editorial = composeEditorialProfile({
    title: destination,
    category: "City",
    area,
    coordinates: trip.center,
  }, { facts, travellerProfile: { focus: Array.from(state.userPreferences || []).join(", ") } });

  const outdoor = trip.outdoorIntel;
  const headsUp = Array.isArray(trip.headsUps) ? trip.headsUps[0] : null;

  return `
    <div class="location-editorial-card" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px; border-left: 4px solid var(--orange);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
        <div>
          <span class="voice-mono" style="font-size: 0.74rem; font-weight: 700; color: var(--orange); text-transform: uppercase; letter-spacing: 0.8px;">Destination Brief & Atmosphere</span>
          <h3 class="voice-serif" style="font-size: 1.35rem; font-weight: 700; color: var(--ink); margin: 2px 0 0 0;">${escapeHtml(destination)} Intro</h3>
        </div>
        <span class="voice-mono" style="font-size: 0.74rem; font-weight: 700; color: var(--ink-muted); background: var(--paper-subtle); padding: 3px 8px; border-radius: var(--radius-pill); border: 1px solid var(--line-light);">
          ${escapeHtml(trip.countryCode || 'EU')} · ${escapeHtml((trip.language || 'en').toUpperCase())}
        </span>
      </div>

      <p style="font-size: 0.92rem; line-height: 1.5; color: var(--ink); margin: 0; font-weight: 500;">
        ${escapeHtml(editorial.standfirst || `${destination} is your primary travel anchor for this journey.`)} ${escapeHtml(editorial.whyStop || '')}
      </p>

      ${editorial.atmosphere ? `
        <div style="font-size: 0.85rem; color: var(--ink-muted); line-height: 1.45; font-style: italic; background: var(--paper-subtle); padding: 10px 12px; border-radius: var(--radius-md);">
          "${escapeHtml(editorial.atmosphere)}"
        </div>
      ` : ''}

      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px;">
        ${outdoor?.terrainLabel ? `<span class="voice-mono" style="font-size: 0.74rem; background: var(--paper); border: 1px solid var(--line); padding: 3px 8px; border-radius: var(--radius-sm); color: var(--ink-muted);">🏞️ ${escapeHtml(outdoor.terrainLabel)}</span>` : ''}
        ${outdoor?.coastal ? `<span class="voice-mono" style="font-size: 0.74rem; background: var(--paper); border: 1px solid var(--line); padding: 3px 8px; border-radius: var(--radius-sm); color: var(--blue);">🌊 Coastal Destination</span>` : ''}
        ${headsUp ? `<span class="voice-mono" style="font-size: 0.74rem; background: rgba(210,104,43,0.1); border: 1px solid rgba(210,104,43,0.25); padding: 3px 8px; border-radius: var(--radius-sm); color: var(--orange);">💡 ${escapeHtml(headsUp.title || headsUp.text || 'Local guidance')}</span>` : ''}
      </div>
    </div>
  `;
}

function renderOverviewSubTab(trip) {
  const checklist = state.checklists[trip.id] || trip.checklist || [];
  const completedCount = checklist.filter(i => i.completed).length;
  const progressPct = checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0;
  const events = trip.calendarEvents || [];
  
  // Comprehensive saved places gatherer across Explore & Search
  const savedPlaces = getSavedPlacesForTrip(trip);

  return `
    <div class="overview-subtab-view" style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Dynamic Location Editorial Intro Card -->
      ${renderLocationEditorialIntroCard(trip)}

      <!-- Destination Hero Banner with Brand Stamp Badge -->
      <div class="overview-hero-card" style="background: linear-gradient(135deg, var(--paper-card) 0%, var(--paper-subtle) 100%); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-sm); position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
          <div>
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--orange);">TRIP OVERVIEW</span>
            <h2 class="voice-serif" style="font-size: 1.6rem; font-weight: 700; color: var(--ink); margin: 4px 0;">${escapeHtml(trip.destination)} ${trip.flag}</h2>
            <p class="voice-mono" style="font-size: 0.85rem; color: var(--ink-muted); margin-bottom: 10px;">${escapeHtml(trip.dates)}</p>
            <button class="btn btn--outline btn--sm" data-action="share-trip" title="Share trip link">
              ${renderIcon("share")} Share Link
            </button>
          </div>
          <!-- Brand Stamp Emblem (Guidelines Section 07) -->
          <div>
            ${TRIP_STAMP_SVG("", 68)}
          </div>
        </div>

        <!-- Stat Counters Grid -->
        <div class="overview-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line-light);">
          <div class="stat-box" style="text-align: center; background: var(--paper); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            <div class="voice-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--red);">${events.length}</div>
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--ink-muted); text-transform: uppercase; margin-top: 2px;">Activities</div>
          </div>
          <div class="stat-box" style="text-align: center; background: var(--paper); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            <div class="voice-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--blue);">${savedPlaces.length}</div>
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--ink-muted); text-transform: uppercase; margin-top: 2px;">Saved Spots</div>
          </div>
          <div class="stat-box" style="text-align: center; background: var(--paper); padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--line);">
            <div class="voice-mono" style="font-size: 1.2rem; font-weight: 700; color: var(--green);">${progressPct}%</div>
            <div style="font-size: 0.72rem; font-weight: 600; color: var(--ink-muted); text-transform: uppercase; margin-top: 2px;">Planned</div>
          </div>
        </div>
      </div>

      <!-- Saved / Bookmarked Spots Panel (Reminders to Add to Plan) -->
      <div class="dashboard-card" style="padding: 20px;">
        <div class="saved-spots-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div class="saved-spots-panel-copy">
            <h3 class="dashboard-card__title" style="margin: 0; font-size: 1.1rem;">Saved & Bookmarked Spots</h3>
            <p style="font-size: 0.8rem; color: var(--ink-muted); margin: 2px 0 0 0;">Bookmarked places ready to add to your trip itinerary</p>
          </div>
          <span class="badge badge--info voice-mono saved-spots-count-badge" style="font-weight: 700;">${savedPlaces.length} Saved</span>
        </div>

        <div class="saved-spots-reminder-list" style="display: flex; flex-direction: column; gap: 12px;">
          ${savedPlaces.length === 0 ? `
            <div style="background: var(--paper); border: 1px dashed var(--line); border-radius: var(--radius-md); padding: 20px; text-align: center; color: var(--ink-muted); font-size: 0.88rem;">
              No bookmarked spots yet. Tap ${renderIcon("bookmark")} on any recommendation in Explore to shortlist places here!
            </div>
          ` : savedPlaces.map(spot => {
            const isAdded = events.some(e => e.title === spot.title);
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 16px; box-shadow: var(--shadow-sm);">
                <div>
                  <h4 style="font-size: 0.96rem; font-weight: 700; color: var(--ink); margin: 0 0 4px 0;">${escapeHtml(spot.title)}</h4>
                  <span class="voice-mono" style="font-size: 0.75rem; color: var(--ink-muted);">${escapeHtml(spot.category || 'Sight')} • ${escapeHtml(spot.subtitle || 'Recommended')}</span>
                </div>
                <div>
                  ${isAdded ? `
                    <button class="btn btn--outline btn--xs" disabled style="opacity: 0.65; cursor: default; background: var(--paper-subtle); color: var(--ink-muted);">
                      ${renderIcon("check")} Added
                    </button>
                  ` : `
                    <button class="btn btn--primary btn--xs" data-action="add-idea-to-itinerary" data-title="${escapeHtml(spot.title)}" data-location="${escapeHtml(spot.subtitle || spot.title)}">
                      ${renderIcon("plus")} Add to Plan
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Planning Progress Summary Card -->
      <div class="dashboard-card">
        <div class="dashboard-card__header">
          <h3 class="dashboard-card__title">Planning Progress</h3>
          <span class="badge ${progressPct === 100 ? 'badge--success' : 'badge--info'}">${completedCount} of ${checklist.length} tasks (${progressPct}%)</span>
        </div>
        <div class="progress-bar-wrap mb-sm">
          <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
        </div>
        <p class="greeting-status">${progressPct === 100 ? '🎉 All planning tasks completed!' : 'Keep going! Your checklist updates stay synced across Home & Trips.'}</p>
      </div>

      <!-- Synced Planning Checklist (Full CRUD) -->
      <div class="dashboard-card planning-widget">
        <div class="dashboard-card__header">
          <h3 class="dashboard-card__title">Trip Checklist</h3>
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
    </div>
  `;
}

function getSavedPlacesForTrip(trip) {
  const savedSet = state.savedPlaceIds || new Set();
  const places = [];

  (trip.ideas || []).forEach(idea => {
    if (savedSet.has(idea.id)) {
      places.push(idea);
    }
  });

  [...(trip.tourismPois || []), ...(trip.hiddenGems || []), ...(trip.osmPlaces || [])].forEach(idea => {
    if (savedSet.has(idea.id) && !places.some(p => p.id === idea.id || p.title === idea.title)) {
      places.push(idea);
    }
  });

  (trip.events || []).forEach(evt => {
    const evtId = evt.id || evt.title;
    if (savedSet.has(evtId) && !places.some(p => p.id === evtId || p.title === evt.title)) {
      places.push({
        id: evtId,
        title: evt.title,
        category: evt.category || "Event",
        subtitle: evt.dates || evt.venue || "Saved Event"
      });
    }
  });

  CONCERTS_DATABASE.forEach(cnc => {
    if (savedSet.has(cnc.id) && !places.some(p => p.id === cnc.id || p.title === cnc.title)) {
      places.push({
        id: cnc.id,
        title: cnc.title,
        category: "Concert",
        subtitle: `${cnc.venue} • ${cnc.dates}`
      });
    }
  });

  const SEARCH_SPOTS = [
    { id: "sp1", title: "Savannah Coffee Roasters", category: "Café", subtitle: "Specialty pourovers" },
    { id: "sp2", title: "Saint-Germain Bistro", category: "Dining", subtitle: "Classic French cuisine" },
    { id: "sp3", title: "Musée d'Orsay", category: "Museum", subtitle: "Impressionist masterworks" },
    { id: "sp4", title: "Palais-Royal Garden", category: "Park", subtitle: "Tranquil courtyard" }
  ];

  SEARCH_SPOTS.forEach(spot => {
    if (savedSet.has(spot.id) && !places.some(p => p.id === spot.id || p.title === spot.title)) {
      places.push(spot);
    }
  });

  return places;
}

function renderExploreSubTab(trip) {
  const curatedIdeas = trip.ideas || [];
  const tourismPois = trip.tourismPois || [];
  const hiddenGems = trip.hiddenGems || [];
  const osmPlaces = trip.osmPlaces || [];
  const discoveryStatus = state.getTourismDiscoveryStatus ? state.getTourismDiscoveryStatus(trip.id) : { status: "idle" };
  const events = trip.calendarEvents || [];

  const top10Pois = tourismPois.slice(0, 10);
  const remainingPois = tourismPois.slice(10);

  return `
    <div class="explore-subtab-view">
      <div class="explore-header mb-md">
        <h2 class="voice-serif" style="font-size: 1.4rem; font-weight: 700; margin-bottom: 4px;">Explore ${escapeHtml(trip.destination)}</h2>
        <p style="font-size: 0.85rem; color: var(--ink-muted);">Top 10 Attractions, hidden gems, and local recommendations for your trip</p>
      </div>

      ${renderTourismStatus(discoveryStatus, tourismPois.length + hiddenGems.length + osmPlaces.length)}

      ${top10Pois.length ? renderExploreSection("Top 10 Destination POIs", "Attractions, monuments, architecture, historic sites, and natural landmarks.", top10Pois, events) : ""}
      ${hiddenGems.length ? renderExploreSection("Hidden Gems", "Lower-noise interesting places around your destination.", hiddenGems, events) : ""}
      ${osmPlaces.length ? renderExploreSection("OpenStreetMap & Local Food", "Cafes, food, nightlife, shops, parks, viewpoints, and local spots from OSM & Foursquare.", osmPlaces, events) : ""}
      ${remainingPois.length ? renderExploreSection("More Attractions", "Additional top rated places around the area.", remainingPois, events) : ""}
      ${renderExploreSection("Curated Picks", "Hand-picked starting points already in your trip.", curatedIdeas, events)}
    </div>
  `;
}

function renderTourismStatus(discoveryStatus, resultCount) {
  if (resultCount || discoveryStatus.status === "ready" || discoveryStatus.status === "cached") return "";
  if (discoveryStatus.status === "loading") {
    return `
      <div class="dashboard-card" style="padding: 14px 16px; margin-bottom: 16px; border-color: rgba(210,104,43,0.28);">
        <span class="voice-mono" style="font-size: 0.76rem; font-weight: 700; color: var(--orange);">OPENTRIPMAP</span>
        <p style="font-size: 0.85rem; color: var(--ink-muted); margin: 4px 0 0 0;">Loading live tourism POIs around this trip...</p>
      </div>
    `;
  }
  if (discoveryStatus.status === "not-configured") {
    return `
      <div class="dashboard-card" style="padding: 14px 16px; margin-bottom: 16px;">
        <span class="voice-mono" style="font-size: 0.76rem; font-weight: 700; color: var(--orange);">OPENTRIPMAP READY</span>
        <p style="font-size: 0.85rem; color: var(--ink-muted); margin: 4px 0 0 0;">Add an OpenTripMap API key to show live Top POIs and Hidden Gems here. Curated picks still work.</p>
      </div>
    `;
  }
  return "";
}

function renderExploreSection(title, subtitle, ideas, events) {
  if (!ideas.length) return "";
  return `
    <section class="explore-section" style="margin-bottom: 24px;">
      <div class="section-header" style="margin-bottom: 10px;">
        <div>
          <h3 class="section-title">${escapeHtml(title)}</h3>
          <p style="font-size: 0.8rem; color: var(--ink-muted); margin: 2px 0 0 0;">${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="explore-ideas-grid" style="display: flex; flex-direction: column; gap: 14px;">
        ${ideas.map((idea) => renderExploreIdeaCard(idea, events)).join("")}
      </div>
    </section>
  `;
}

function renderExploreIdeaCard(idea, events) {
  const isSaved = state.savedPlaceIds.has(idea.id);
  const isAdded = events.some(e => e.title === idea.title);
  const isOpenTripMap = idea.source === "OpenTripMap";
  const isOpenStreetMap = String(idea.source || "").startsWith("OpenStreetMap") || idea.sourceRole === "osm";
  const sourceMeta = idea.distance || idea.source || "OpenTripMap";
  const providerLabel = isOpenStreetMap ? "OpenStreetMap" : "OpenTripMap";
  return `
    <div class="explore-card" style="background: var(--paper-card); border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
      <div data-action="open-poi-detail" data-idea-id="${idea.id}" style="height: 160px; background-image: url('${idea.image}'); background-size: cover; background-position: center; position: relative; cursor: pointer;">
        <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${idea.id}" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.9); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; box-shadow: var(--shadow-sm);" aria-label="Bookmark">
          ${renderIcon("bookmark")}
        </button>
        <span class="category-badge" style="position: absolute; bottom: 12px; left: 12px; background: rgba(23,24,23,0.85); color: #fff; padding: 4px 10px; border-radius: var(--radius-pill); font-size: 0.72rem; font-weight: 700;">${escapeHtml(idea.category)}</span>
      </div>

      <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
        <div data-action="open-poi-detail" data-idea-id="${idea.id}" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; cursor: pointer;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 2px;">${escapeHtml(idea.title)}</h3>
            <p style="font-size: 0.82rem; color: var(--ink-muted); margin: 0;">${escapeHtml(idea.subtitle)}</p>
          </div>
          <span class="voice-mono" style="font-size: 0.76rem; font-weight: 700; color: ${isOpenTripMap || isOpenStreetMap ? 'var(--orange)' : 'var(--sun)'}; background: ${isOpenTripMap || isOpenStreetMap ? 'rgba(210,104,43,0.12)' : 'rgba(233,199,107,0.18)'}; padding: 3px 8px; border-radius: var(--radius-pill); white-space: nowrap;">${isOpenTripMap || isOpenStreetMap ? escapeHtml(sourceMeta) : `★ ${escapeHtml(idea.rating)}`}</span>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--line-light); gap: 10px;">
          <span class="voice-mono" style="font-size: 0.78rem; color: var(--ink-muted);">${isOpenTripMap || isOpenStreetMap ? providerLabel : `${renderIcon("clock")} ${escapeHtml(idea.duration || '2 hours')}`}</span>
          ${isAdded ? `
            <button class="btn btn--outline btn--xs" disabled style="opacity: 0.65; cursor: default; background: var(--paper-subtle); color: var(--ink-muted); border-color: var(--line);">
              ${renderIcon("check")} Added
            </button>
          ` : `
            <button class="btn btn--primary btn--xs" data-action="add-idea-to-itinerary" data-title="${escapeHtml(idea.title)}" data-location="${escapeHtml(idea.subtitle)}">
              ${renderIcon("plus")} Add to Itinerary
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function getMomentsForTrip(tripId) {
  return (state.moments || []).filter((moment) => {
    return getMomentTripId(moment) === tripId;
  });
}

function getMomentTripId(moment = {}) {
  if (moment.tripId || moment.trip_id) return moment.tripId || moment.trip_id;
  if (isMediaMoment(moment)) {
    return inferTripIdFromMomentDate(moment) || state.activeTrip?.id || "paris";
  }
  return "paris";
}

function inferTripIdFromMomentDate(moment = {}) {
  const value = moment.date || moment.createdAt || moment.created_at || "";
  const momentTime = Date.parse(String(value).slice(0, 10));
  if (Number.isNaN(momentTime)) return "";

  const dayMs = 24 * 60 * 60 * 1000;
  const tripMatches = (state.getAllTrips ? state.getAllTrips() : [state.activeTrip])
    .map((trip) => {
      const startTime = Date.parse(trip.startDate || "");
      if (Number.isNaN(startTime)) return null;
      const endTime = startTime + Math.max(1, Number(trip.daysCount || 1)) * dayMs;
      const distance = momentTime < startTime ? startTime - momentTime : momentTime > endTime ? momentTime - endTime : 0;
      return { trip, distance };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance);

  const nearest = tripMatches[0];
  return nearest && nearest.distance <= 21 * dayMs ? nearest.trip.id : "";
}

function isMediaMoment(moment = {}) {
  return Boolean(getMomentMediaUrl(moment)) || ["photo", "video", "image"].includes(String(moment.type || "").toLowerCase());
}

function hasUsableMediaMoment(moment = {}) {
  return Boolean(getMomentMediaUrl(moment)) && ["photo", "video", "image", ""].includes(String(moment.type || "").toLowerCase());
}

function isWrittenNoteMoment(moment = {}) {
  const type = String(moment.type || "note").toLowerCase();
  return !["photo", "video", "image"].includes(type) && !getMomentMediaUrl(moment);
}

function getMomentMediaUrl(moment = {}) {
  return String(moment.media_url || moment.mediaUrl || "");
}

function renderMomentTags(moment) {
  const tags = [
    moment.placeTitle,
    moment.placeCategory,
    moment.geoLabel,
    ...(moment.tags || []),
  ].filter(Boolean);
  if (!tags.length) {
    return `<div class="journal-media-tags"><span>Untagged</span></div>`;
  }
  return `
    <div class="journal-media-tags">
      ${[...new Set(tags)].slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
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

function sanitizeHref(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderTransitSubTab(trip) {
  const route = getFlightRouteForTrip(trip);
  const flightDetails = route.originIata && route.destinationIata ? calculateFlightDistance(route.originIata, route.destinationIata) : null;
  const guide = getDestinationTransitGuide(trip.destination);
  const flightType = FLIGHT_TYPE_OPTIONS.find((option) => option.id === route.flightType) || FLIGHT_TYPE_OPTIONS[0];
  const flightSearch = trip.flightSearch || { status: "idle", offers: [] };
  const routeDisplay = getFlightRouteDisplay(route, flightSearch);

  return `
    <div class="transit-subtab-container" style="display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px;">
      <!-- Flight Planning & Air Route Card -->
      <div class="dashboard-card card-pattern-poly" style="padding: 24px;">
        <div class="card-eyebrow-row">
          <span class="badge badge--brand">${renderIcon("navigation")} Flight Search</span>
          <span class="voice-mono" style="font-size: 0.8rem; color: var(--journey-orange); font-weight: 700;">${escapeHtml(getFlightProviderLabel(flightSearch))}</span>
        </div>
        
        <h3 class="transit-flight-title">Flight Route: ${escapeHtml(routeDisplay.title)}</h3>
        <p class="transit-flight-subtitle">${escapeHtml(routeDisplay.subtitle)}</p>

        <form id="transit-flight-route-form" class="transit-route-form" autocomplete="off">
          <label class="transit-route-field">
            <span>From airport</span>
            <div class="airport-autocomplete">
              <input class="drawer-input airport-autocomplete-input" name="originAirport" type="text" value="${escapeHtml(formatAirportLabel(route.originAirport) || route.originLabel || route.originIata || "")}" placeholder="City or airport, e.g. Gdansk" autocomplete="off" required />
              <div class="airport-autocomplete-menu" role="listbox"></div>
            </div>
          </label>
          <label class="transit-route-field">
            <span>To airport</span>
            <div class="airport-autocomplete">
              <input class="drawer-input airport-autocomplete-input" name="destinationAirport" type="text" value="${escapeHtml(formatAirportLabel(route.destinationAirport) || route.destinationLabel || route.destinationIata || "")}" placeholder="City or airport, e.g. Paris" autocomplete="off" required />
              <div class="airport-autocomplete-menu" role="listbox"></div>
            </div>
          </label>
          <label class="transit-route-field">
            <span>Flight type</span>
            <select class="drawer-input" name="flightType">
              ${FLIGHT_TYPE_OPTIONS.map((option) => `
                <option value="${escapeHtml(option.id)}" ${option.id === route.flightType ? "selected" : ""}>${escapeHtml(option.label)}</option>
              `).join("")}
            </select>
          </label>
          <button class="btn btn--outline btn--sm transit-route-form__save" type="submit">
            ${renderIcon("save")} Save route
          </button>
        </form>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 16px;">
          <div style="background: var(--paper-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--line-light);">
            <span style="font-size: 0.75rem; color: var(--ink-muted); display: block;">Air Distance</span>
            <span class="voice-mono" style="font-weight: 700; font-size: 1.1rem; color: var(--ink);">${flightDetails ? `${flightDetails.distanceKm} km` : "Set route"}</span>
          </div>
          <div style="background: var(--paper-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--line-light);">
            <span style="font-size: 0.75rem; color: var(--ink-muted); display: block;">Flight Type</span>
            <span class="voice-mono" style="font-weight: 700; font-size: 1.1rem; color: var(--journey-orange);">${escapeHtml(flightType.label)}</span>
          </div>
          <div style="background: var(--paper-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--line-light);">
            <span style="font-size: 0.75rem; color: var(--ink-muted); display: block;">Departure Airport</span>
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--ink);">${route.originAirport ? `${route.originAirport.flag} ${route.originAirport.name}` : "Missing"}</span>
          </div>
          <div style="background: var(--paper-subtle); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--line-light);">
            <span style="font-size: 0.75rem; color: var(--ink-muted); display: block;">Arrival Airport</span>
            <span style="font-weight: 700; font-size: 0.95rem; color: var(--ink);">${route.destinationAirport ? `${route.destinationAirport.flag} ${route.destinationAirport.name}` : "Missing"}</span>
          </div>
        </div>

        <div class="flight-search-panel">
          <div class="flight-search-panel__header">
            <div>
              <h4>Flight options</h4>
              <p>${escapeHtml(getFlightSearchCopy(flightSearch))}</p>
            </div>
            <button class="btn btn--primary btn--sm" data-action="search-trip-flights" ${flightSearch.status === "loading" || !route.originIata || !route.destinationIata ? "disabled" : ""}>
              ${renderIcon("refresh")} ${flightSearch.status === "loading" ? "Searching" : "Search flights"}
            </button>
          </div>
          <div class="flight-offers-list">
            ${renderFlightOffers(flightSearch.offers || [])}
          </div>
        </div>
      </div>

      <!-- Arrival Survival Guide & Local Transport Card -->
      <div class="dashboard-card card-pattern-map" style="padding: 24px;">
        <div class="card-eyebrow-row">
          <span class="badge badge--brand" style="background: rgba(101,112,91,0.15); color: var(--field-green);">${renderIcon("compass")} Arrival Survival Guide</span>
          <span class="voice-mono" style="font-size: 0.8rem; color: var(--field-green); font-weight: 700;">First-Mile Transport</span>
        </div>

        <h3 style="font-family: 'Playfair Display', serif; font-size: 1.4rem; margin: 10px 0 6px; color: var(--ink);">Arriving in ${escapeHtml(guide.city)}</h3>
        <p style="font-size: 0.92rem; color: var(--ink-muted); margin-bottom: 20px; line-height: 1.45;">${escapeHtml(guide.summary)}</p>

        <h4 style="font-size: 1rem; font-weight: 700; color: var(--ink); margin-bottom: 12px;">Airport to City Transport Options:</h4>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
          ${guide.arrivalOptions.map(opt => `
            <div style="display: flex; gap: 14px; background: var(--paper); padding: 14px 16px; border-radius: var(--radius-md); border: 1px solid var(--line);">
              <span style="font-size: 1.6rem; line-height: 1;">${opt.icon}</span>
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <h5 style="margin: 0; font-size: 0.98rem; font-weight: 700; color: var(--ink);">${escapeHtml(opt.mode)}</h5>
                  <span class="voice-mono" style="font-size: 0.82rem; font-weight: 700; color: var(--journey-orange);">${escapeHtml(opt.cost)}</span>
                </div>
                <p style="margin: 0 0 4px; font-size: 0.85rem; color: var(--ink-muted);">${escapeHtml(opt.description)}</p>
                <span class="voice-mono" style="font-size: 0.78rem; color: var(--atlas-blue); font-weight: 600;">⏱ Travel time: ${escapeHtml(opt.duration)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <h4 style="font-size: 1rem; font-weight: 700; color: var(--ink); margin-bottom: 10px;">Pro Tips for Arrival Day:</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.88rem; color: var(--ink-muted); line-height: 1.6;">
          ${guide.localTips.map(renderTransitTip).join('')}
        </ul>
      </div>
    </div>
  `;
}

function renderTransitTip(tip) {
  if (typeof tip === "string") return `<li>${escapeHtml(tip)}</li>`;
  const text = tip?.text || "";
  const url = sanitizeHref(tip?.url || "");
  return `
    <li>
      ${escapeHtml(text)}
      ${url ? `
        <a class="transit-tip-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(tip.linkLabel || "Open link")}
          ${renderIcon("arrowRight")}
        </a>
      ` : ""}
    </li>
  `;
}

function getFlightProviderLabel(flightSearch = {}) {
  if (flightSearch.status === "ready" && flightSearch.source === "amadeus") return "Amadeus live";
  if (flightSearch.status === "not-configured") return "Amadeus ready";
  if (flightSearch.status === "loading") return "Searching";
  return "Airport data + estimates";
}

function getFlightSearchCopy(flightSearch = {}) {
  if (flightSearch.status === "loading") return "Checking configured flight providers for this route.";
  if (flightSearch.status === "ready" && flightSearch.source === "amadeus") return "Live offers from Amadeus Flight Offers Search.";
  if (flightSearch.status === "not-configured") return "Add Amadeus keys to switch this from estimates to live fares.";
  if (flightSearch.status === "fallback" && flightSearch.offers?.length) return "Estimated options based on route distance and selected flight type.";
  if (flightSearch.status === "error") return "Flight search failed. Try again or use the route estimate.";
  return "Search to populate route-aware options for this trip.";
}

function renderFlightOffers(offers = []) {
  if (!offers.length) {
    return `
      <div class="flight-offer-empty">
        <strong>No offers loaded yet</strong>
        <span>Use Search flights to fetch live results or route estimates.</span>
      </div>
    `;
  }

  return offers.map((offer) => `
    <article class="flight-offer-card">
      <div class="flight-offer-card__main">
        <span class="flight-offer-card__code voice-mono">${escapeHtml(offer.airlineCode || "")}</span>
        <div>
          <h5>${escapeHtml(offer.airline || "Flight option")}</h5>
          <p>${escapeHtml(offer.originIata)} ${escapeHtml(offer.departureTime || "")} → ${escapeHtml(offer.destinationIata)} ${escapeHtml(offer.arrivalTime || "")}</p>
        </div>
      </div>
      <div class="flight-offer-card__meta">
        <strong>${offer.price ? `${escapeHtml(offer.currency || "EUR")} ${escapeHtml(String(offer.price))}` : "Check fare"}</strong>
        <span>${escapeHtml(offer.duration || "")} · ${offer.stops ? `${offer.stops} stop` : "Direct"}</span>
      </div>
      <p class="flight-offer-card__hint">${escapeHtml(offer.bookingHint || offer.source || "")}</p>
    </article>
  `).join("");
}
