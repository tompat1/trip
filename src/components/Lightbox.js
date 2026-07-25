import { state } from "../state.js";

export function renderLightbox() {
  const media = state.activeLightboxMedia;
  if (!media) return "";

  const isVideo = media.type === "video" || (media.media_url && media.media_url.includes("data:video"));

  return `
    <div class="lightbox-overlay" data-action="close-lightbox">
      <div class="lightbox-container" onclick="event.stopPropagation()">
        <button class="lightbox-close-btn" data-action="close-lightbox" aria-label="Close lightbox">✕</button>
        
        <div class="lightbox-media-wrapper">
          ${
            isVideo
              ? `<video src="${media.media_url}" controls autoplay class="lightbox-video"></video>`
              : `<img src="${media.media_url}" alt="${escapeHtml(media.title || 'Trip Photo')}" class="lightbox-img" />`
          }
        </div>

        <div class="lightbox-caption-card">
          <h3 class="lightbox-title">${escapeHtml(media.title || 'Trip Memory')}</h3>
          <p class="lightbox-date">📅 ${escapeHtml(media.date || 'Oct 2026')}</p>
          ${media.text ? `<p class="lightbox-text">${escapeHtml(media.text)}</p>` : ''}
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
