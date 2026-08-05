const CONCIERGE_FORM_ACTIONS = new Set([
  "submit-ai-concierge",
  "submit-quick-capture-concierge",
  "submit-home-concierge-form",
]);

const CONCIERGE_FORM_SELECTOR = [
  ".ai-concierge-form",
  ".quick-capture-concierge-form",
  ".home-concierge-quick-form",
].join(", ");

export function isConciergeForm(form) {
  if (!form?.matches) return false;
  const action = form.dataset?.action || form.id || "";
  return CONCIERGE_FORM_ACTIONS.has(action) || form.matches(CONCIERGE_FORM_SELECTOR);
}

export function shouldOpenConciergeDrawerForElement(element) {
  return Boolean(element?.closest?.(".home-ai-concierge-card"));
}

export function submitConciergePrompt(appState, promptText = "", { openDrawer = false } = {}) {
  const prompt = String(promptText || "").trim();
  if (!prompt || !appState?.askAiConcierge) return false;
  if (appState.aiConciergeLoading) return false;

  if (openDrawer && appState.toggleAiConcierge) {
    appState.toggleAiConcierge(true);
  }

  appState.askAiConcierge(prompt);
  return true;
}

export function submitConciergeForm(appState, form) {
  if (!isConciergeForm(form)) return false;
  const input = form.querySelector("input[type='text'], textarea");
  const query = input?.value?.trim() || "";
  if (!query) return true;

  const submitted = submitConciergePrompt(appState, query, {
    openDrawer: shouldOpenConciergeDrawerForElement(form),
  });
  if (submitted) input.value = "";
  return true;
}
