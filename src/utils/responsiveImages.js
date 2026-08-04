/**
 * Utility for responsive image optimization in TRIP.
 * Handles auto WebP/AVIF formatting, viewport sizing (srcset), quality compression,
 * and lazy/async decoding attributes.
 */

/**
 * Optimizes a URL (Unsplash, Wikimedia, etc.) with width, quality, and format parameters.
 * @param {string} url - Original image URL
 * @param {Object} options
 * @param {number} [options.width=800] - Target width in pixels
 * @param {number} [options.quality=75] - Quality compression (1-100)
 * @param {string} [options.format='auto'] - Format parameter ('auto', 'webp', 'avif')
 * @returns {string} Optimized URL
 */
export function getOptimizedImageUrl(url, { width = 800, quality = 75, format = "auto" } = {}) {
  if (!url || typeof url !== "string") return "";
  
  // Return SVG and data URIs as is
  if (url.startsWith("data:") || url.endsWith(".svg") || url.includes(".svg?")) {
    return url;
  }

  // Handle Unsplash images
  if (url.includes("images.unsplash.com")) {
    try {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set("w", String(width));
      parsedUrl.searchParams.set("q", String(quality));
      parsedUrl.searchParams.set("auto", format === "auto" ? "format" : format);
      parsedUrl.searchParams.set("fit", "crop");
      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  // Handle Wikimedia images (scale via thumb URL width parameter if present)
  if (url.includes("upload.wikimedia.org/wikipedia/commons/thumb/")) {
    return url.replace(/\/\d+px-/, `/${width}px-`);
  }

  return url;
}

/**
 * Generates a responsive `srcset` attribute string for multiple widths.
 * @param {string} url - Original image URL
 * @param {number[]} [widths=[400, 800, 1200]] - Array of target widths
 * @param {number} [quality=75] - Compression quality
 * @returns {string} `srcset` string e.g. "url-400 400w, url-800 800w"
 */
export function getResponsiveSrcset(url, widths = [400, 800, 1200], quality = 75) {
  if (!url || typeof url !== "string" || url.startsWith("data:") || url.endsWith(".svg")) {
    return "";
  }

  return widths
    .map((w) => {
      const optUrl = getOptimizedImageUrl(url, { width: w, quality });
      return `${optUrl} ${w}w`;
    })
    .join(", ");
}

/**
 * Generates full string of HTML attributes for an `<img>` element.
 * @param {string} url - Original image URL
 * @param {Object} options
 * @param {string} [options.alt=""] - Alt text
 * @param {string} [options.className=""] - CSS class name
 * @param {string} [options.sizes="(max-width: 600px) 100vw, 800px"] - Sizes attribute
 * @param {string} [options.loading="lazy"] - 'lazy' or 'eager'
 * @param {string} [options.fetchpriority="auto"] - 'high', 'low', or 'auto'
 * @param {number} [options.width] - Intrinsic width
 * @param {number} [options.height] - Intrinsic height
 * @returns {string} String of HTML attributes
 */
export function renderResponsiveImgAttributes(url, {
  alt = "",
  className = "",
  sizes = "(max-width: 600px) 100vw, 800px",
  loading = "lazy",
  fetchpriority = "auto",
  width,
  height,
} = {}) {
  const defaultSrc = getOptimizedImageUrl(url, { width: 800 });
  const srcset = getResponsiveSrcset(url);

  let attrs = `src="${escapeHtml(defaultSrc)}" alt="${escapeHtml(alt)}" decoding="async" loading="${loading}"`;
  if (srcset) attrs += ` srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"`;
  if (className) attrs += ` class="${escapeHtml(className)}"`;
  if (fetchpriority && fetchpriority !== "auto") attrs += ` fetchpriority="${fetchpriority}"`;
  if (width) attrs += ` width="${width}"`;
  if (height) attrs += ` height="${height}"`;

  return attrs;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
