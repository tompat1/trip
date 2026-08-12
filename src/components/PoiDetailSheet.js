import { state } from "../state.js";
import { renderIcon } from "../utils/icons.js";
import { getOptimizedImageUrl } from "../utils/responsiveImages.js";

export function renderPoiDetailSheet() {
  const poi = state.activePoiDetail;
  if (!poi) return "";

  const isSaved = state.savedPlaceIds.has(poi.id);
  const events = state.activeTrip?.calendarEvents || [];
  const isAdded = events.some((e) => e.title === poi.title);
  const coverImg = getOptimizedImageUrl(poi.image || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80', { width: 800, quality: 75 });

  return `
    <div class="drawer-overlay" data-action="close-poi-detail">
      <div class="drawer-sheet" style="max-height: 85vh; overflow-y: auto;">
        <div class="drawer-drag-handle" data-action="close-poi-detail"></div>

        <div style="position: relative; margin: -16px -16px 16px -16px; height: 200px; background-image: url('${coverImg}'); background-size: cover; background-position: center;">
          <button class="btn btn--icon btn--ghost" data-action="close-poi-detail" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.85); border-radius: 50%;" aria-label="Close">
            ${renderIcon("x")}
          </button>
          <span class="category-badge" style="position: absolute; bottom: 12px; left: 12px; background: rgba(23,24,23,0.85); color: #fff; padding: 4px 12px; border-radius: var(--radius-pill); font-size: 0.78rem; font-weight: 700;">
            ${escapeHtml(poi.category || "Place")}
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
          <div>
            <h2 class="voice-serif" style="font-size: 1.35rem; font-weight: 700; color: var(--ink); margin: 0 0 4px 0;">${escapeHtml(poi.title)}</h2>
            <p style="font-size: 0.85rem; color: var(--ink-muted); margin: 0;">${escapeHtml(poi.subtitle || poi.neighborhood || poi.category)}</p>
          </div>
          <button class="btn-bookmark ${isSaved ? 'is-saved' : ''}" data-action="toggle-bookmark" data-place-id="${poi.id}" style="background: var(--paper-subtle); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--line); flex-shrink: 0;" aria-label="Bookmark">
            ${renderIcon("bookmark")}
          </button>
        </div>

        ${poi.loadingDetails ? `
          <div style="padding: 16px 0; text-align: center; color: var(--ink-muted); font-size: 0.85rem;">
            <span class="voice-mono">${renderIcon("refreshCw")} Loading details...</span>
          </div>
        ` : `
          ${poi.description ? `
            <div style="margin-bottom: 16px; font-size: 0.9rem; line-height: 1.5; color: var(--ink); background: var(--paper-subtle); padding: 12px 14px; border-radius: var(--radius-md); border-left: 3px solid var(--orange);">
              ${escapeHtml(poi.description)}
            </div>
          ` : ''}

          ${(poi.nomadTags || []).length > 0 ? `
            <div class="nomad-tags-container" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
              ${poi.nomadTags.map((tag) => `
                <span style="font-size: 0.72rem; font-weight: 600; padding: 4px 10px; border-radius: var(--radius-pill); background: rgba(56, 92, 115, 0.1); color: var(--atlas-blue, #385C73); border: 1px solid rgba(56, 92, 115, 0.2);">
                  ${escapeHtml(tag)}
                </span>
              `).join('')}
            </div>
          ` : ''}

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; font-size: 0.82rem; color: var(--ink-muted);">
            ${poi.address ? `<div>📍 <strong>Address:</strong> ${escapeHtml(poi.address)}</div>` : ''}
            ${poi.openingHours ? `<div>🕒 <strong>Hours:</strong> ${escapeHtml(poi.openingHours)}</div>` : ''}
            ${poi.distance ? `<div>📏 <strong>Distance:</strong> ${escapeHtml(poi.distance)}</div>` : ''}
            ${poi.source ? `<div>ℹ️ <strong>Source:</strong> ${escapeHtml(poi.source)}</div>` : ''}
            ${poi.website ? `<div>🔗 <a href="${escapeHtml(poi.website)}" target="_blank" rel="noopener" style="color: var(--orange); text-decoration: underline;">Official Website</a></div>` : ''}
            ${poi.wikipedia ? `<div>📖 <a href="${escapeHtml(poi.wikipedia)}" target="_blank" rel="noopener" style="color: var(--orange); text-decoration: underline;">Wikipedia Article</a></div>` : ''}
          </div>
        `}

        <div style="display: flex; gap: 10px; margin-top: 12px;">
          ${isAdded ? `
            <button class="btn btn--outline" disabled style="width: 100%; opacity: 0.7; justify-content: center;">
              ${renderIcon("check")} Added to Itinerary
            </button>
          ` : `
            <button class="btn btn--primary" data-action="add-idea-to-itinerary" data-title="${escapeHtml(poi.title)}" data-location="${escapeHtml(poi.subtitle || '')}" style="width: 100%; justify-content: center;">
              ${renderIcon("plus")} Add to Itinerary
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
