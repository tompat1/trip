import { state } from "../state.js";

export function openCompanionInviteFlow(defaultMethod = "link") {
  state.setView("profile");
  requestAnimationFrame(() => {
    const form = document.getElementById("profile-companion-form");
    if (!form) return;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    const methodInput = form.querySelector(`input[name="inviteMethod"][value="${defaultMethod}"]`);
    if (methodInput) methodInput.checked = true;
    form.querySelector("input[name='email']")?.focus();
  });
}

export function handleTripManagementChange(target) {
  if (target?.dataset?.action !== "set-profile-companion-trip") return false;
  state.setProfileCompanionTrip(target.value || state.activeTripId);
  return true;
}

export async function handleTripManagementSubmit(eventOrForm, { showToast = () => {}, withPageLoader = async (_label, task) => task() } = {}) {
  const form = eventOrForm?.target || eventOrForm;
  if (!isCompanionInviteForm(form)) return false;
  eventOrForm?.preventDefault?.();
  await submitCompanionInviteForm(form, { showToast, withPageLoader });
  return true;
}

export async function handleTripManagementAction(action, target, event, {
  showToast = () => {},
  withPageLoader = async (_label, task) => task(),
  flashPageLoader = () => {},
} = {}) {
  if (action === "invite-companions") {
    flashPageLoader("Opening invites");
    state.setView("profile");
    setTimeout(() => document.getElementById("profile-companion-form")?.querySelector("input[name='email']")?.focus(), 0);
    return true;
  }

  if (action === "open-trip-manager") {
    state.openTripManager();
    return true;
  }

  if (action === "close-trip-manager") {
    if (target.classList.contains("trip-management-overlay") && event?.target !== target) return true;
    state.closeTripManager();
    return true;
  }

  if (action === "select-managed-trip") {
    const tripId = target.dataset.tripId;
    if (tripId) {
      state.setTrip(tripId);
      state.closeTripManager();
      showToast("Trip selected.");
    }
    return true;
  }

  if (action === "prepare-trip-management-invite") {
    const tripId = target.dataset.tripId;
    if (tripId) {
      state.setProfileCompanionTrip(tripId);
      requestAnimationFrame(() => document.getElementById("trip-management-invite-form")?.querySelector("input[name='email']")?.focus());
    }
    return true;
  }

  if (action === "delete-trip") {
    await deleteTripFromTarget(target, { showToast, withPageLoader });
    return true;
  }

  if (action === "remove-trip-companion") {
    const companionId = target.dataset.companionId;
    const tripId = target.dataset.tripId || state.profileCompanionTripId || state.activeTripId;
    if (companionId && confirm("Remove this travel companion from the trip?")) {
      await state.removeTripCompanion(tripId, companionId);
      showToast("Travel companion removed.");
    }
    return true;
  }

  if (action === "copy-companion-invite") {
    const companion = getCompanionById(target.dataset.companionId, target.dataset.tripId);
    if (companion) {
      await copyInviteToClipboard(companion);
      showToast("Invite link copied.");
    }
    return true;
  }

  if (action === "show-companion-qr") {
    state.toggleCompanionQr(target.dataset.companionId || "");
    return true;
  }

  if (action === "share-trip") {
    flashPageLoader("Opening invite");
    openCompanionInviteFlow("link");
    showToast("Choose who to invite, then send or copy the invite link.");
    return true;
  }

  if (action === "walkthrough-invite-companions") {
    state.completeOnboarding();
    openCompanionInviteFlow("link");
    showToast("Invite companions for the selected trip.");
    return true;
  }

  if (action === "help-invite-companions") {
    state.closeHelp();
    flashPageLoader("Opening invite");
    openCompanionInviteFlow("link");
    showToast("Invite companions for the selected trip.");
    return true;
  }

  return false;
}

async function deleteTripFromTarget(target, { showToast, withPageLoader }) {
  const tripId = target.dataset.tripId;
  const trip = state.getAllTrips().find((item) => item.id === tripId);
  if (!tripId || !trip) return;

  const ok = confirm(`Delete "${trip.destination || "this trip"}"? This removes its itinerary, companions, and local trip data.`);
  if (!ok) return;

  const result = await withPageLoader("Deleting trip", () => state.deleteTrip(tripId));
  if (!result.ok && result.error === "demo-trip") {
    showToast("Demo trips cannot be deleted.");
  } else if (!result.ok && result.error === "not-owner") {
    showToast("Only the trip owner can delete this trip.");
  } else if (result.ok) {
    showToast(result.source === "worker" ? "Trip deleted." : "Trip removed locally.");
  } else {
    showToast("Could not delete trip.");
  }
}

function isCompanionInviteForm(form) {
  return form?.id === "profile-companion-form" || form?.id === "trip-management-invite-form";
}

async function submitCompanionInviteForm(form, { showToast, withPageLoader }) {
  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;
  const formData = new FormData(form);
  const tripId = formData.get("tripId") || state.profileCompanionTripId || state.activeTripId;
  const result = await withPageLoader("Sending invite", () => state.inviteTripCompanion(tripId, {
    name: formData.get("name") || "",
    email: formData.get("email") || "",
    role: formData.get("role") || "viewer",
    inviteMethod: formData.get("inviteMethod") || "email",
    personalMessage: formData.get("personalMessage") || "",
  }));
  if (button) button.disabled = false;
  if (!result.ok && result.error === "invalid-email") {
    showToast("Add a valid companion email.");
    form.email?.focus();
    return;
  }
  if (!result.ok && result.error === "past-trip") {
    showToast("Choose a future trip before inviting companions.");
    return;
  }
  if (result.ok) {
    form.reset();
    if (result.companion) await deliverCompanionInvite(result.companion);
    showToast(result.source === "worker" ? "Travel companion invited." : "Travel companion saved locally.");
  } else {
    showToast("Could not add companion.");
  }
}

async function deliverCompanionInvite(companion = {}) {
  const method = companion.inviteMethod || "email";
  const text = getInviteText(companion);
  if (method === "sms") {
    window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
  } else if (method === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  } else if (method === "qr") {
    state.toggleCompanionQr(companion.id);
  } else if (method === "link") {
    await copyInviteToClipboard(companion);
  } else {
    const trip = state.getAllTrips().find((item) => item.id === companion.tripId) || state.activeTrip;
    const subject = `Trip invite: ${companion.tripTitle || trip?.destination || "our trip"}`;
    window.location.href = `mailto:${encodeURIComponent(companion.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  }
}

async function copyInviteToClipboard(companion = {}) {
  const text = companion.inviteUrl || getInviteText(companion);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function getCompanionById(companionId = "", tripId = state.profileCompanionTripId || state.activeTripId) {
  const trip = state.getAllTrips().find((item) => item.id === tripId) || state.activeTrip;
  return (trip?.companions || []).find((companion) => companion.id === companionId);
}

function getInviteText(companion = {}) {
  if (companion.inviteText) return companion.inviteText;
  const trip = state.getAllTrips().find((item) => item.id === companion.tripId) || state.activeTrip || {};
  const tripTitle = companion.tripTitle || trip.title || trip.name || (trip.destination ? `Roadtrip ${trip.destination}` : "this trip");
  return [
    `${state.userProfile?.name || "Thomas"} invited you to join ${tripTitle}.`,
    `${companion.destination || trip.destination || "Destination"} - ${companion.dates || trip.dates || "Dates TBD"}`,
    `${companion.travelersCount || Math.max(1, (trip.companions || []).length + 1)} travelers`,
    "",
    companion.personalMessage || "Plan it. Live it. Remember it.",
    companion.inviteUrl ? `Open invite: ${companion.inviteUrl}` : "",
  ].filter((line, index, lines) => line || (lines[index - 1] && lines[index + 1])).join("\n");
}
