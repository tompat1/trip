export function getHomeEmptyStateMode(appState = {}) {
  if (appState.activeTrip) return "trip";
  return appState.isAuthenticated ? "account-empty" : "signed-out";
}
