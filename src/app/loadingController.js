import tripLogoUrl from "../assets/trip_logo.svg";
import tripLogoWhiteUrl from "../assets/trip_logo_white.svg";
import tripMapPatternUrl from "../assets/trip_MapPattern.svg";

const LANDING_HERO_URL = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85";
const STARTUP_PRELOAD_TIMEOUT_MS = 2400;
const STARTUP_MINIMUM_MS = 4200;
const STARTUP_ILLUSTRATION_INTERVAL_MS = 1550;
const STARTUP_PRELOAD_REVEAL_STEP_MS = 430;
const PAGE_LOADER_DELAY_MS = 160;
const PAGE_LOADER_MINIMUM_MS = 520;

const landingIllustrationPreloads = Object.values(import.meta.glob("../assets/illisar/*.{webp,png,jpg,jpeg,avif}", {
  eager: true,
  import: "default",
}));

let renderApp = () => {};
let booted = false;
let startupIllustrationUrls = [];
let startupIllustrationIndex = 0;
let startupIllustrationTimer = null;
let pageLoaderCount = 0;
let pageLoaderShowTimer = null;
let pageLoaderHideTimer = null;
let pageLoaderVisibleAt = 0;
let startupPreloadStatus = [
  { id: "brand", label: "Brand marks", status: "queued", visible: false },
  { id: "illustrations", label: "TRIP illustrations", status: "queued", visible: false },
  { id: "hero", label: "Landing hero", status: "queued", visible: false },
  { id: "fonts", label: "Travel typography", status: "queued", visible: false },
  { id: "routes", label: "Route visuals", status: "queued", visible: false },
];

import { state } from "../state.js";

export function isAppBooted() {
  return booted;
}

export async function bootApp(onRender) {
  renderApp = typeof onRender === "function" ? onRender : renderApp;
  prepareStartupIllustrations();
  startStartupIllustrationRotation();
  renderApp();
  await Promise.all([
    wait(STARTUP_MINIMUM_MS),
    withTimeout(preloadStartupResources(), STARTUP_PRELOAD_TIMEOUT_MS),
  ]);
  booted = true;
  stopStartupIllustrationRotation();
  renderApp();
  state.refreshWeather?.();
  if (navigator.geolocation) {
    state.requestCurrentLocation?.();
  }
  warmRemainingImages();
}

export function renderTripLoadingPage() {
  prepareStartupIllustrations();
  const preloadItem = getCurrentStartupPreloadItem();
  return `
    <div class="trip-loading-page" role="status" aria-label="Loading TRIP">
      <div class="trip-page-loader__panel">
        ${startupIllustrationUrls.length ? `
          <div class="trip-loading-page__illustration" aria-hidden="true">
            ${startupIllustrationUrls.map((src, index) => `
              <img
                class="${index === startupIllustrationIndex ? "is-active" : ""}"
                src="${escapeHtml(src)}"
                alt=""
                decoding="async"
                style="--loader-image-index: ${index}"
              />
            `).join("")}
            ${startupIllustrationUrls.length > 1 ? `
              <span class="trip-loading-page__illustration-count">${startupIllustrationIndex + 1}/${startupIllustrationUrls.length}</span>
            ` : ""}
          </div>
        ` : ""}
        ${renderTripFlapSpinner("trip-flap-spinner--loader")}
        <span class="trip-loading-page__text">Preparing your journey</span>
        <ul class="trip-loading-page__preloads" aria-label="Preload status">
          ${preloadItem ? `
            <li class="trip-loading-page__preload is-${escapeHtml(preloadItem.status)}" data-preload-id="${escapeHtml(preloadItem.id)}">
              <span aria-hidden="true"></span>
              <strong>${escapeHtml(preloadItem.label)}</strong>
              <small>${escapeHtml(formatPreloadStatus(preloadItem.status))}</small>
            </li>
          ` : ""}
        </ul>
      </div>
    </div>
  `;
}

export async function withPageLoader(label, task, options = {}) {
  showPageLoader(label, options);
  try {
    return await task();
  } finally {
    hidePageLoader();
  }
}

export function flashPageLoader(label = "Loading") {
  showPageLoader(label, { delay: 0 });
  window.setTimeout(hidePageLoader, PAGE_LOADER_MINIMUM_MS);
}

function getRandomStartupIllustrations(count = 5) {
  if (!landingIllustrationPreloads.length) return "";
  return [...landingIllustrationPreloads]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, landingIllustrationPreloads.length));
}

function getCurrentStartupPreloadItem() {
  const visibleItems = startupPreloadStatus.filter((item) => item.visible);
  return visibleItems[visibleItems.length - 1] || null;
}

function renderTripFlapSpinner(modifier = "") {
  const markerChip = `
    <svg class="trip-flap-spinner__marker" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"></path>
      <circle cx="12" cy="10" r="2.15"></circle>
    </svg>
  `;

  return `
    <span class="trip-flap-spinner ${modifier}" aria-hidden="true">
      ${["T", "R", "I", "P", markerChip].map((item, index) => `
        <span class="trip-flap-spinner__chip${index === 4 ? " trip-flap-spinner__chip--marker" : ""}" style="--flap-index: ${index}">
          ${item}
        </span>
      `).join("")}
    </span>
  `;
}

function ensurePageLoader() {
  let loader = document.querySelector(".trip-page-busy");
  if (loader) return loader;
  loader = document.createElement("div");
  loader.className = "trip-page-busy";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.innerHTML = `
    <div class="trip-page-busy__bg trip-airport-loader">
      <div class="trip-airport-loader__badge">
        <span class="voice-mono">✈️ DEPARTURE BOARD</span>
      </div>
      ${renderTripFlapSpinner("trip-flap-spinner--busy")}
      <strong class="trip-airport-loader__title">Loading</strong>
      <small class="trip-airport-loader__subtitle">Mapping location & POIs...</small>
    </div>
  `;
  document.body.appendChild(loader);
  return loader;
}

function setPageLoaderLabel(label = "Loading") {
  const loader = ensurePageLoader();
  const titleEl = loader.querySelector(".trip-airport-loader__title");
  const subtitleEl = loader.querySelector(".trip-airport-loader__subtitle");

  if (!titleEl || !subtitleEl) return;

  if (label.includes("·")) {
    const parts = label.split("·");
    titleEl.textContent = parts[0].trim();
    subtitleEl.textContent = parts.slice(1).join("·").trim();
  } else {
    titleEl.textContent = label;
    subtitleEl.textContent = "Fetching location data & route details...";
  }
}

function showPageLoader(label = "Loading", options = {}) {
  if (!booted) return;
  pageLoaderCount += 1;
  setPageLoaderLabel(label);
  window.clearTimeout(pageLoaderHideTimer);
  window.clearTimeout(pageLoaderShowTimer);

  const delay = Number.isFinite(options.delay) ? Math.max(0, options.delay) : PAGE_LOADER_DELAY_MS;
  pageLoaderShowTimer = window.setTimeout(() => {
    const loader = ensurePageLoader();
    pageLoaderVisibleAt = Date.now();
    loader.classList.add("is-visible");
  }, delay);
}

function hidePageLoader() {
  pageLoaderCount = Math.max(0, pageLoaderCount - 1);
  if (pageLoaderCount > 0) return;

  window.clearTimeout(pageLoaderShowTimer);
  const loader = document.querySelector(".trip-page-busy");
  if (!loader?.classList.contains("is-visible")) return;

  const visibleFor = Date.now() - pageLoaderVisibleAt;
  const holdFor = Math.max(0, PAGE_LOADER_MINIMUM_MS - visibleFor);
  window.clearTimeout(pageLoaderHideTimer);
  pageLoaderHideTimer = window.setTimeout(() => {
    if (pageLoaderCount > 0) return;
    loader.classList.remove("is-visible");
  }, holdFor);
}

function formatPreloadStatus(status = "queued") {
  if (status === "ready") return "Ready";
  if (status === "loading") return "Loading";
  if (status === "timeout") return "Continuing";
  return "Queued";
}

async function preloadStartupResources() {
  const illustrationBatch = [
    ...startupIllustrationUrls,
    ...landingIllustrationPreloads.slice(0, 7),
  ].filter(Boolean);

  const groups = [
    { id: "brand", tasks: [tripLogoUrl, tripLogoWhiteUrl].filter(Boolean).map(preloadImage) },
    { id: "illustrations", tasks: illustrationBatch.map(preloadImage) },
    { id: "hero", tasks: [preloadImage(LANDING_HERO_URL)] },
    { id: "fonts", tasks: [document.fonts?.ready?.catch?.(() => undefined) || Promise.resolve()] },
    { id: "routes", tasks: [preloadImage(tripMapPatternUrl)] },
  ];

  await Promise.all(groups.map((group, index) => preloadGroup(group.id, group.tasks, index)));
}

function prepareStartupIllustrations() {
  if (!startupIllustrationUrls.length) {
    startupIllustrationUrls = getRandomStartupIllustrations(5);
  }
}

function startStartupIllustrationRotation() {
  if (startupIllustrationTimer || startupIllustrationUrls.length <= 1) return;
  startupIllustrationTimer = window.setInterval(() => {
    startupIllustrationIndex = (startupIllustrationIndex + 1) % startupIllustrationUrls.length;
    if (!booted) updateStartupIllustration();
  }, STARTUP_ILLUSTRATION_INTERVAL_MS);
}

function stopStartupIllustrationRotation() {
  if (!startupIllustrationTimer) return;
  window.clearInterval(startupIllustrationTimer);
  startupIllustrationTimer = null;
}

async function preloadGroup(id, tasks = [], index = 0) {
  await wait(index * STARTUP_PRELOAD_REVEAL_STEP_MS);
  setPreloadVisible(id);
  setPreloadStatus(id, "loading");
  try {
    await Promise.all(tasks);
    setPreloadStatus(id, "ready");
  } catch {
    setPreloadStatus(id, "timeout");
  }
}

function setPreloadVisible(id) {
  startupPreloadStatus = startupPreloadStatus.map((item) => item.id === id ? { ...item, visible: true } : item);
  if (!booted) updateStartupPreloadList();
}

function setPreloadStatus(id, status) {
  startupPreloadStatus = startupPreloadStatus.map((item) => item.id === id ? { ...item, status } : item);
  if (!booted) updateStartupPreloadList();
}

function updateStartupIllustration() {
  const frame = document.querySelector(".trip-loading-page__illustration");
  if (!frame) {
    renderApp();
    return;
  }
  const count = frame.querySelector(".trip-loading-page__illustration-count");
  frame.querySelectorAll("img").forEach((image, index) => {
    image.classList.toggle("is-active", index === startupIllustrationIndex);
  });
  if (count) count.textContent = `${startupIllustrationIndex + 1}/${startupIllustrationUrls.length}`;
}

function updateStartupPreloadList() {
  const list = document.querySelector(".trip-loading-page__preloads");
  if (!list) {
    renderApp();
    return;
  }
  const item = getCurrentStartupPreloadItem();
  if (!item) {
    list.innerHTML = "";
    return;
  }
  let row = list.querySelector(".trip-loading-page__preload");
  if (!row || row.dataset.preloadId !== item.id) {
    list.innerHTML = "";
    row = document.createElement("li");
    row.className = "trip-loading-page__preload";
    row.innerHTML = `
      <span aria-hidden="true"></span>
      <strong></strong>
      <small></small>
    `;
    list.appendChild(row);
  }
  row.dataset.preloadId = item.id;
  row.className = `trip-loading-page__preload is-${item.status}`;
  row.querySelector("strong").textContent = item.label;
  row.querySelector("small").textContent = formatPreloadStatus(item.status);
}

function warmRemainingImages() {
  const remaining = landingIllustrationPreloads.slice(8);
  const preload = () => {
    remaining.forEach((url, index) => {
      window.setTimeout(() => preloadImage(url), index * 80);
    });
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 3000 });
  } else {
    window.setTimeout(preload, 800);
  }
}

function preloadImage(url = "") {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  });
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([promise, wait(timeoutMs)]);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
