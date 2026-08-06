import { state, isFutureTrip } from "../state.js";
import { getTripDateStatus } from "../utils/tripDates.js";
import { renderIcon } from "../utils/icons.js";

export function renderTripManagementModal() {
  if (!state.tripManagerOpen) return "";

  const trips = state.getAllTrips ? state.getAllTrips() : [];
  const futureTrips = trips.filter((trip) => isFutureTrip(trip));
  const selectedInviteTripId = futureTrips.some((trip) => trip.id === state.profileCompanionTripId)
    ? state.profileCompanionTripId
    : futureTrips[0]?.id || "";
  const canInvite = state.isAuthenticated && futureTrips.length > 0;

  return `
    <div class="trip-management-overlay" data-action="close-trip-manager">
      <section class="trip-management-modal" role="dialog" aria-modal="true" aria-labelledby="trip-management-title">
        <header class="trip-management-header">
          <div>
            <span class="trip-management-kicker voice-mono">${renderIcon("mapPin")} Trip management</span>
            <h2 id="trip-management-title">Manage trips</h2>
          </div>
          <button class="btn btn--icon btn--ghost" data-action="close-trip-manager" type="button" aria-label="Close trip management">
            ${renderIcon("x")}
          </button>
        </header>

        <div class="trip-management-body">
          <section class="trip-management-section trip-management-invite-section" aria-labelledby="trip-management-invite-title">
            <div class="trip-management-section__header">
              <div>
                <h3 id="trip-management-invite-title">Invite traveler</h3>
              </div>
              <span class="trip-management-count-pill">${futureTrips.length} upcoming</span>
            </div>

            ${canInvite ? `
              <form class="trip-management-invite-form" id="trip-management-invite-form">
                <label class="trip-management-field trip-management-field--trip">
                  <span>Trip</span>
                  <select name="tripId" data-action="set-profile-companion-trip" required>
                    ${futureTrips.map((trip) => `
                      <option value="${escapeHtml(trip.id)}" ${trip.id === selectedInviteTripId ? "selected" : ""}>
                        ${escapeHtml(`${trip.flag || ""} ${trip.destination || "Trip"} · ${trip.dates || "Dates TBD"}`.trim())}
                      </option>
                    `).join("")}
                  </select>
                </label>
                <label class="trip-management-field">
                  <span>Name</span>
                  <input name="name" type="text" autocomplete="name" placeholder="Traveler name" />
                </label>
                <label class="trip-management-field">
                  <span>Email</span>
                  <input name="email" type="email" autocomplete="email" placeholder="friend@example.com" required />
                </label>
                <label class="trip-management-field">
                  <span>Role</span>
                  <select name="role">
                    <option value="viewer">Viewer</option>
                    <option value="planner">Planner</option>
                    <option value="co-owner">Co-owner</option>
                  </select>
                </label>
                <label class="trip-management-field">
                  <span>Send by</span>
                  <select name="inviteMethod">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="link">Copy link</option>
                    <option value="qr">QR code</option>
                  </select>
                </label>
                <label class="trip-management-field trip-management-field--message">
                  <span>Message</span>
                  <input name="personalMessage" type="text" placeholder="Plan it. Live it. Remember it." />
                </label>
                <button class="btn btn--primary btn--sm trip-management-submit" type="submit">
                  ${renderIcon("send")} Send invite
                </button>
              </form>
            ` : `
              <div class="trip-management-empty">
                <strong>${state.isAuthenticated ? "No upcoming trips available." : "Sign in to invite travelers."}</strong>
                <span>${state.isAuthenticated ? "Companion invites are only available for planning trips." : "Trip invites are tied to account-backed trips."}</span>
              </div>
            `}
          </section>

          <section class="trip-management-section" aria-labelledby="trip-management-list-title">
            <div class="trip-management-section__header">
              <div>
                <h3 id="trip-management-list-title">Trips</h3>
              </div>
              <button class="btn btn--primary btn--sm" data-action="create-trip" type="button">
                ${renderIcon("plus")} New trip
              </button>
            </div>

            <div class="trip-management-list">
              ${trips.length ? trips.map((trip) => renderTripManagementItem(trip, selectedInviteTripId)) : `
                <div class="trip-management-empty">
                  <strong>No trips yet.</strong>
                  <span>Create your first trip to start planning.</span>
                </div>
              `}
            </div>
          </section>
        </div>
      </section>
    </div>
  `;
}

function renderTripManagementItem(trip, selectedInviteTripId) {
  const status = getTripDateStatus(trip);
  const stage = status.state === "done" ? "remember" : status.state === "active" ? "live" : "plan";
  const companionCount = (trip.companions || []).length;
  const isActive = trip.id === state.activeTripId;
  const isDemo = isProtectedDemoTrip(trip);
  const canDelete = typeof state.canDeleteTrip === "function" ? state.canDeleteTrip(trip) : !isDemo;
  const canInviteToTrip = state.isAuthenticated && isFutureTrip(trip);
  const activeQrCompanion = (trip.companions || []).find((companion) => companion.id === state.activeCompanionQrId);

  return `
    <article class="trip-management-item ${isActive ? "is-active" : ""}">
      <div class="trip-management-item__main">
        <div class="trip-management-item__icon" aria-hidden="true">${escapeHtml(trip.flag || "•")}</div>
        <div class="trip-management-item__copy">
          <strong>${escapeHtml(trip.destination || "Trip")}</strong>
          <span>${escapeHtml(trip.dates || "Dates TBD")} · ${companionCount} ${companionCount === 1 ? "companion" : "companions"}</span>
          <div class="trip-management-item__meta">
            <small class="trip-management-status trip-management-status--${stage}">${escapeHtml(formatTripStageLabel(stage))}</small>
            <small>${escapeHtml(formatSyncStatus(trip))}</small>
            ${isActive ? "<small>Current</small>" : ""}
          </div>
        </div>
      </div>
      <div class="trip-management-item__actions">
        ${isActive ? "" : `
          <button class="btn btn--outline btn--xs" data-action="select-managed-trip" data-trip-id="${escapeHtml(trip.id)}" type="button">
            ${renderIcon("check")} Select
          </button>
        `}
        ${canInviteToTrip ? `
          <button class="btn btn--outline btn--xs" data-action="prepare-trip-management-invite" data-trip-id="${escapeHtml(trip.id)}" type="button" ${trip.id === selectedInviteTripId ? "aria-pressed=\"true\"" : ""}>
            ${renderIcon("userPlus")} Invite
          </button>
        ` : ""}
        ${canDelete ? `
          <button class="btn btn--ghost btn--icon trip-management-delete-btn" data-action="delete-trip" data-trip-id="${escapeHtml(trip.id)}" type="button" aria-label="Delete ${escapeHtml(trip.destination || "trip")}">
            ${renderIcon("trash")}
          </button>
        ` : `
          <span class="trip-management-locked-pill">${isDemo ? "Demo" : "Owner only"}</span>
        `}
      </div>
      ${activeQrCompanion ? `
        <div class="trip-management-qr">
          <img src="${escapeHtml(createQrInvite(activeQrCompanion))}" alt="QR code invite for ${escapeHtml(activeQrCompanion.name || activeQrCompanion.email || "traveler")}" loading="lazy" />
          <span>Scan to open the invite for ${escapeHtml(activeQrCompanion.name || activeQrCompanion.email || "this traveler")}.</span>
        </div>
      ` : ""}
    </article>
  `;
}

function formatTripStageLabel(stage) {
  if (stage === "remember") return "Remember";
  if (stage === "live") return "Live";
  return "Planning";
}

function formatSyncStatus(trip = {}) {
  if (isProtectedDemoTrip(trip)) return "Demo";
  if (trip.syncStatus === "synced") return "Cloud";
  if (trip.syncStatus === "needs-auth") return "Draft";
  if (trip.syncStatus === "sync-error") return "Local fallback";
  return "Local";
}

function isProtectedDemoTrip(trip = {}) {
  return trip.syncStatus === "demo" || (trip.isDemoTrip && trip.syncStatus !== "synced");
}

function createQrInvite(companion = {}) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(companion.inviteUrl || "")}`;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
