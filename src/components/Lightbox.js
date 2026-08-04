import { state } from "../state.js";
import { getOptimizedImageUrl, getResponsiveSrcset } from "../utils/responsiveImages.js";
import { renderIcon } from "../utils/icons.js";

export function renderLightbox() {
  const media = state.activeLightboxMedia;
  if (!media) return "";

  const mediaUrl = media.media_url || media.mediaUrl || "";
  const isVideo = media.type === "video" || mediaUrl.includes("data:video");
  const optMediaUrl = getOptimizedImageUrl(mediaUrl, { width: 1200, quality: 82 });
  const srcset = getResponsiveSrcset(mediaUrl, [600, 1200, 1800], 82);

  return `
    <div class="lightbox-overlay" data-action="close-lightbox">
      <div class="lightbox-container">
        <button class="btn btn--icon btn--ghost lightbox-close-btn" data-action="close-lightbox" aria-label="Close">
          ${renderIcon("x")}
        </button>
        
        <div class="lightbox-media-wrapper">
          ${
            isVideo
              ? `<video src="${mediaUrl}" controls autoplay class="lightbox-video"></video>`
              : `<img src="${optMediaUrl}" ${srcset ? `srcset="${srcset}" sizes="90vw"` : ""} alt="${escapeHtml(media.title || 'Trip Photo')}" class="lightbox-img" decoding="async" />`
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
