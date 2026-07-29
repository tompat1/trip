import { state } from "../state.js";

export function renderLightbox() {
  const media = state.activeLightboxMedia;
  if (!media) return "";

  const mediaUrl = media.media_url || media.mediaUrl || "";
  const isVideo = media.type === "video" || mediaUrl.includes("data:video");

  return `
    <div class="lightbox-overlay" data-action="close-lightbox">
      <div class="lightbox-container">
        <button class="btn btn--icon btn--ghost lightbox-close-btn" data-action="close-lightbox" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
        </button>
        
        <div class="lightbox-media-wrapper">
          ${
            isVideo
              ? `<video src="${mediaUrl}" controls autoplay class="lightbox-video"></video>`
              : `<img src="${mediaUrl}" alt="${escapeHtml(media.title || 'Trip Photo')}" class="lightbox-img" />`
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
