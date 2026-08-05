import { state } from "../state.js";
import { getTripDateStatus } from "../utils/tripDates.js";

export function handleDockNavigation(target, { requireAppSession, flashPageLoader } = {}) {
  const nav = target?.dataset?.nav;
  if (!nav) return false;

  if (!requireAppSession?.("login", "Sign in to open TRIP.")) return true;

  if (nav === "journal") {
    state.setPlanSubTab("journal");
    flashPageLoader?.("Opening journal");
    state.setView("plan");
    return true;
  }

  if (nav === "live" && getTripDateStatus(state.activeTrip).state !== "active") {
    state.setPlanSubTab("overview");
    flashPageLoader?.("Opening planning");
    state.setView("plan");
    return true;
  }

  if (nav === "plan") state.setPlanSubTab("overview");
  flashPageLoader?.(`Opening ${nav}`);
  state.setView(nav);
  return true;
}

export function handleRouteAction(action, target, { requireAppSession, flashPageLoader } = {}) {
  if (action === "go-app" || action === "go-home") {
    flashPageLoader?.("Opening home");
    state.setView("home");
    return true;
  }

  if (action === "go-plan") {
    if (!requireAppSession?.("login", "Sign in to open trip planning.")) return true;
    if (target?.dataset?.subtab) state.setPlanSubTab(target.dataset.subtab);
    flashPageLoader?.("Opening trips");
    state.setView("plan");
    return true;
  }

  if (action === "go-plan-timeline") {
    if (!requireAppSession?.("login", "Sign in to open your itinerary.")) return true;
    state.setPlanSubTab("plan");
    state.setPlanViewMode("timeline");
    flashPageLoader?.("Opening timeline");
    state.setView("plan");
    return true;
  }

  if (action === "go-search") {
    if (!requireAppSession?.("signup", "Create an account or sign in to explore TRIP ideas.")) return true;
    flashPageLoader?.("Opening search");
    state.setView("search");
    return true;
  }

  if (action === "go-live") {
    if (!requireAppSession?.("login", "Sign in before using Live mode.")) return true;
    if (getTripDateStatus(state.activeTrip).state !== "active") {
      state.setPlanSubTab("overview");
      flashPageLoader?.("Opening planning");
      state.setView("plan");
    } else {
      flashPageLoader?.("Opening live");
      state.setView("live");
    }
    return true;
  }

  if (action === "go-moments") {
    if (!requireAppSession?.("login", "Sign in to open Journal and Story.")) return true;
    flashPageLoader?.("Opening journal");
    state.setView("plan");
    state.setPlanSubTab("journal");
    return true;
  }

  if (action === "go-profile") {
    if (!requireAppSession?.("login", "Sign in to open your profile.")) return true;
    flashPageLoader?.("Opening profile");
    state.setView("profile");
    return true;
  }

  if (action === "switch-to-landing") {
    flashPageLoader?.("Opening TRIP");
    state.setView("landing");
    return true;
  }

  return false;
}
