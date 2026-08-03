/**
 * ProfilePhotoEditorModal.js — Universal Profile & Journal Photo Editor with Travel Graphics
 * Features:
 * - Avatar Mode (Circular crop & travel avatar presets)
 * - Journal & Quick Capture Mode (1:1, 4:5, 16:9 crop aspects)
 * - Travel Stamps & Graphics Overlay (Postcard Stamp, Passport Seal, Location Badge, Wanderlust)
 * - Color Filters (Vintage Postcard, Sunny Travel, B&W Film Noir, Vivid Memories)
 * - Interactive Canvas Viewport (Pan, Zoom, 90° Rotation)
 * - High-DPI compressed export (512x512 for avatars, 1080x1080 for journal moments)
 */
import { renderIcon } from "../utils/icons.js";

const TRAVEL_AVATAR_PRESETS = [
  { id: "preset_1", name: "Classic Traveler", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=512&q=80" },
  { id: "preset_2", name: "Wanderer", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=512&q=80" },
  { id: "preset_3", name: "Explorer", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=512&q=80" },
  { id: "preset_4", name: "Backpacker", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=512&q=80" },
  { id: "preset_5", name: "Photographer", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=512&q=80" },
  { id: "preset_6", name: "Nomad", url: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=512&q=80" },
];

const TRAVEL_STICKERS = [
  { id: "postcard_stamp", label: "Postcard Stamp", icon: "mail", desc: "Vintage postal cancellation mark" },
  { id: "passport_seal", label: "Passport Seal", icon: "shield", desc: "Official travel entry seal" },
  { id: "location_badge", label: "Location Badge", icon: "mapPin", desc: "Frosted destination pill" },
  { id: "wanderlust", label: "Wanderlust Script", icon: "sparkles", desc: "Stylized travel badge" },
  { id: "none", label: "No Graphics", icon: "slash", desc: "Clean photo without stamps" },
];

const PHOTO_FILTERS = [
  { id: "none", label: "Original", css: "none" },
  { id: "vintage", label: "Vintage Postcard", css: "sepia(0.35) contrast(1.1) brightness(0.95)" },
  { id: "sunny", label: "Sunny Travel", css: "saturate(1.35) contrast(1.05) brightness(1.06)" },
  { id: "noir", label: "B&W Film Noir", css: "grayscale(1.0) contrast(1.25)" },
  { id: "vivid", label: "Vivid Memories", css: "saturate(1.5) contrast(1.15)" },
];

export function renderProfilePhotoEditorModal(state) {
  if (!state.photoEditorOpen) return "";

  const isSignup = Boolean(state.photoEditorIsSignup);
  const isAvatarMode = state.photoEditorMode === "avatar";
  const isJournalMode = !isAvatarMode;
  const currentAvatar = state.photoEditorImageSrc || state.userAvatar || TRAVEL_AVATAR_PRESETS[0].url;
  const activeTab = state._photoEditorTab || (isAvatarMode ? "upload" : "stickers");
  const activeSticker = state.photoEditorSticker || "postcard_stamp";
  const activeFilter = state.photoEditorFilter || "none";
  const activeAspect = state.photoEditorAspect || (isAvatarMode ? "circle" : "1:1");

  return `
    <div class="modal-backdrop photo-editor-backdrop" id="photo-editor-modal" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title">
      <div class="photo-editor-modal card-pattern-poly animate-scale-up">
        
        ${isSignup ? `
          <div class="photo-editor-signup-banner">
            <span class="photo-editor-step-pill">✨ STEP 1 OF 2 · PROFILE PHOTO</span>
          </div>
        ` : ""}

        <!-- Header -->
        <div class="photo-editor-header">
          <div class="photo-editor-title-wrap">
            <span class="photo-editor-icon">${renderIcon(isJournalMode ? "image" : "camera")}</span>
            <div>
              <h3 id="photo-editor-title" class="photo-editor-title">
                ${isSignup ? "Welcome! Add Profile Photo" : isJournalMode ? "Edit Photo & Travel Graphics" : "Edit Profile Photo"}
              </h3>
              <p class="photo-editor-subtitle">
                ${isSignup ? "Personalize your traveler account with a custom photo or preset" : isJournalMode ? "Crop, apply travel filters, and add Postcard/Passport stamps" : "Drag to reposition, scale, or rotate your avatar photo"}
              </p>
            </div>
          </div>
          <button class="photo-editor-close-btn" data-action="close-photo-editor" type="button" aria-label="${isSignup ? "Skip photo setup" : "Close editor"}">
            ${renderIcon("x")}
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="photo-editor-tabs">
          ${isAvatarMode ? `
            <button class="photo-editor-tab ${activeTab === "upload" ? "active" : ""}" data-action="set-photo-editor-tab" data-tab="upload" type="button">
              ${renderIcon("image")} Custom Photo
            </button>
            <button class="photo-editor-tab ${activeTab === "presets" ? "active" : ""}" data-action="set-photo-editor-tab" data-tab="presets" type="button">
              ${renderIcon("sparkles")} Travel Presets
            </button>
          ` : `
            <button class="photo-editor-tab ${activeTab === "stickers" ? "active" : ""}" data-action="set-photo-editor-tab" data-tab="stickers" type="button">
              ${renderIcon("award")} Graphics & Stamps
            </button>
            <button class="photo-editor-tab ${activeTab === "filters" ? "active" : ""}" data-action="set-photo-editor-tab" data-tab="filters" type="button">
              ${renderIcon("sliders")} Filters
            </button>
            <button class="photo-editor-tab ${activeTab === "crop" ? "active" : ""}" data-action="set-photo-editor-tab" data-tab="crop" type="button">
              ${renderIcon("crop")} Crop & Scale
            </button>
          `}
        </div>

        <!-- Main Viewport Canvas (Always visible for editing) -->
        <div class="photo-editor-body">
          <div class="photo-editor-canvas-container" id="photo-canvas-viewport">
            <canvas id="photo-editor-canvas" width="320" height="320" aria-label="Photo editor canvas"></canvas>
            <input type="file" id="photo-editor-file-input" accept="image/*" style="display:none;" />
          </div>

          <!-- Controls Section based on Active Tab -->

          ${activeTab === "stickers" && isJournalMode ? `
            <div class="photo-editor-section-panel">
              <span class="photo-editor-section-label">Select Travel Graphic / Stamp:</span>
              <div class="photo-stickers-selector-grid">
                ${TRAVEL_STICKERS.map((st) => `
                  <button class="photo-sticker-pill ${activeSticker === st.id ? "active" : ""}" data-action="select-photo-sticker" data-sticker="${st.id}" type="button">
                    <span class="photo-sticker-icon">${renderIcon(st.icon)}</span>
                    <span class="photo-sticker-name">${st.label}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          ` : ""}

          ${activeTab === "filters" && isJournalMode ? `
            <div class="photo-editor-section-panel">
              <span class="photo-editor-section-label">Select Color Filter:</span>
              <div class="photo-filters-selector-grid">
                ${PHOTO_FILTERS.map((ft) => `
                  <button class="photo-filter-pill ${activeFilter === ft.id ? "active" : ""}" data-action="select-photo-filter" data-filter="${ft.id}" type="button">
                    <span class="photo-filter-name">${ft.label}</span>
                  </button>
                `).join("")}
              </div>
            </div>
          ` : ""}

          ${(activeTab === "crop" || activeTab === "upload" || !isJournalMode) ? `
            <!-- Controls Bar: Zoom, Rotate, Reset -->
            <div class="photo-editor-controls">
              ${isJournalMode ? `
                <div class="photo-aspect-selector">
                  <button class="photo-aspect-btn ${activeAspect === "1:1" ? "active" : ""}" data-action="set-photo-editor-aspect" data-aspect="1:1" type="button">1:1 Square</button>
                  <button class="photo-aspect-btn ${activeAspect === "4:5" ? "active" : ""}" data-action="set-photo-editor-aspect" data-aspect="4:5" type="button">4:5 Portrait</button>
                  <button class="photo-aspect-btn ${activeAspect === "16:9" ? "active" : ""}" data-action="set-photo-editor-aspect" data-aspect="16:9" type="button">16:9 Wide</button>
                </div>
              ` : ""}

              <div class="photo-editor-control-group photo-editor-zoom-group">
                <button class="photo-editor-icon-btn" id="btn-zoom-out" type="button" title="Zoom out" aria-label="Zoom out">
                  ${renderIcon("minus")}
                </button>
                <input type="range" id="photo-zoom-slider" min="1" max="3" step="0.02" value="1" aria-label="Zoom photo" />
                <button class="photo-editor-icon-btn" id="btn-zoom-in" type="button" title="Zoom in" aria-label="Zoom in">
                  ${renderIcon("plus")}
                </button>
              </div>

              <div class="photo-editor-control-group photo-editor-action-group">
                <button class="photo-editor-icon-btn" id="btn-rotate-ccw" type="button" title="Rotate Counter-Clockwise 90°" aria-label="Rotate Counter-Clockwise 90°">
                  ${renderIcon("rotateCcw")}
                </button>
                <button class="photo-editor-icon-btn" id="btn-rotate-cw" type="button" title="Rotate Clockwise 90°" aria-label="Rotate Clockwise 90°">
                  ${renderIcon("rotateCw")}
                </button>
                <button class="photo-editor-pill-btn" id="btn-reset-transform" type="button">
                  ${renderIcon("refreshCw")} Reset
                </button>
              </div>
            </div>
          ` : ""}

          <!-- Upload secondary trigger -->
          <div class="photo-editor-upload-bar">
            <button class="btn btn--secondary btn--sm" data-action="trigger-photo-file-upload" type="button">
              ${renderIcon("upload")} Upload Different Image...
            </button>
          </div>
        </div>

        <!-- Tab: Travel Presets Grid (Avatar mode) -->
        ${isAvatarMode && activeTab === "presets" ? `
          <div class="photo-editor-presets-body">
            <p class="photo-editor-presets-hint">Pick from curated travel avatars for your traveler profile:</p>
            <div class="photo-editor-presets-grid">
              ${TRAVEL_AVATAR_PRESETS.map((preset) => `
                <button class="photo-preset-item ${currentAvatar === preset.url ? "photo-preset-item--selected" : ""}" data-action="select-photo-preset" data-preset-url="${preset.url}" type="button">
                  <img src="${preset.url}" alt="${preset.name}" loading="lazy" />
                  <span class="photo-preset-label">${preset.name}</span>
                </button>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <!-- Footer Actions -->
        <div class="photo-editor-footer">
          <button class="btn btn--ghost text-danger btn--sm" data-action="remove-photo-avatar" type="button">
            ${renderIcon("trash2")} ${isJournalMode ? "Clear Photo" : "Remove Photo"}
          </button>
          <div class="photo-editor-footer-right">
            <button class="btn btn--secondary btn--sm" data-action="close-photo-editor" type="button">
              ${isSignup ? "Skip for now" : "Cancel"}
            </button>
            <button class="btn btn--primary btn--sm photo-editor-save-btn" id="btn-save-photo-editor" type="button">
              ${renderIcon("check")} ${isSignup ? "Save & Continue" : isJournalMode ? "Save to Journal" : "Save Profile Photo"}
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Controller helper to bind interactive canvas events once modal is rendered
 */
export class PhotoEditorController {
  constructor(state, onSaveCallback, toastCallback) {
    this.state = state;
    this.onSave = onSaveCallback;
    this.showToast = toastCallback;

    this.img = null;
    this.canvas = null;
    this.ctx = null;

    // Transform State
    this.zoom = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.rotation = 0; // 0, 90, 180, 270

    // Interaction state
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Viewport Constants
    this.viewportSize = 320;
  }

  init(imageSrc) {
    this.canvas = document.getElementById("photo-editor-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.img = new Image();
    this.img.crossOrigin = "anonymous";
    this.img.onload = () => {
      this.resetTransform();
      this.render();
    };
    this.img.onerror = () => {
      this.showToast?.("Unable to load selected image.");
    };
    this.img.src = imageSrc || this.state.photoEditorImageSrc || this.state.userAvatar || TRAVEL_AVATAR_PRESETS[0].url;

    this.bindEvents();
  }

  resetTransform() {
    this.zoom = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.rotation = 0;
    const slider = document.getElementById("photo-zoom-slider");
    if (slider) slider.value = 1.0;
  }

  setImage(src) {
    if (!this.img) this.img = new Image();
    this.img.crossOrigin = "anonymous";
    this.img.onload = () => {
      this.resetTransform();
      this.render();
    };
    this.img.src = src;
  }

  bindEvents() {
    if (!this.canvas) return;

    // Zoom Slider
    const slider = document.getElementById("photo-zoom-slider");
    if (slider) {
      slider.addEventListener("input", (e) => {
        this.zoom = parseFloat(e.target.value);
        this.render();
      });
    }

    // Zoom +/-
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
      this.zoom = Math.min(3.0, this.zoom + 0.15);
      if (slider) slider.value = this.zoom;
      this.render();
    });

    document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
      this.zoom = Math.max(1.0, this.zoom - 0.15);
      if (slider) slider.value = this.zoom;
      this.render();
    });

    // Rotation
    document.getElementById("btn-rotate-cw")?.addEventListener("click", () => {
      this.rotation = (this.rotation + 90) % 360;
      this.render();
    });

    document.getElementById("btn-rotate-ccw")?.addEventListener("click", () => {
      this.rotation = (this.rotation - 90 + 360) % 360;
      this.render();
    });

    // Reset
    document.getElementById("btn-reset-transform")?.addEventListener("click", () => {
      this.resetTransform();
      this.render();
    });

    // Drag / Pan Events (Mouse & Touch via PointerEvents)
    this.canvas.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.startX = e.clientX - this.offsetX;
      this.startY = e.clientY - this.offsetY;
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.isDragging) return;
      this.offsetX = e.clientX - this.startX;
      this.offsetY = e.clientY - this.startY;
      this.render();
    });

    const stopDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    this.canvas.addEventListener("pointerup", stopDrag);
    this.canvas.addEventListener("pointercancel", stopDrag);

    // Mouse wheel zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.zoom = Math.max(1.0, Math.min(3.0, this.zoom + delta));
      if (slider) slider.value = this.zoom;
      this.render();
    }, { passive: false });

    // Save Button
    document.getElementById("btn-save-photo-editor")?.addEventListener("click", () => {
      const croppedDataUrl = this.exportCroppedDataUrl();
      if (croppedDataUrl) {
        this.onSave?.(croppedDataUrl);
      }
    });
  }

  getFilterCss() {
    const filterId = this.state.photoEditorFilter || "none";
    const found = PHOTO_FILTERS.find((f) => f.id === filterId);
    return found ? found.css : "none";
  }

  render() {
    if (!this.ctx || !this.img || !this.img.complete) return;
    const w = this.viewportSize;
    const h = this.viewportSize;
    const center = w / 2;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw transformed image with active color filter
    this.ctx.save();
    this.ctx.filter = this.getFilterCss();
    this.ctx.translate(center + this.offsetX, center + this.offsetY);
    this.ctx.rotate((this.rotation * Math.PI) / 180);
    this.ctx.scale(this.zoom, this.zoom);

    const aspect = this.img.width / this.img.height;
    let drawW = w;
    let drawH = h;
    if (aspect > 1) {
      drawW = h * aspect;
    } else {
      drawH = w / aspect;
    }

    this.ctx.drawImage(this.img, -drawW / 2, -drawH / 2, drawW, drawH);
    this.ctx.restore();

    // 2. Draw Sticker / Travel Stamp Overlay if selected
    this.drawStickerOverlay(this.ctx, w, h);

    // 3. Draw crop mask overlay (Circle for avatar, square/rect for journal)
    const isAvatarMode = this.state.photoEditorMode === "avatar";
    this.drawCropOverlay(this.ctx, w, h, isAvatarMode);
  }

  drawStickerOverlay(ctx, w, h) {
    const stickerId = this.state.photoEditorSticker || "none";
    if (stickerId === "none") return;

    const trip = this.state.activeTrip || {};
    const destination = (trip.destination || "PARIS").toUpperCase();
    const dateStr = (trip.dates || "OCT 2026").toUpperCase();
    const labelText = this.state.photoEditorCaption || trip.destination || "PARIS, FRANCE";

    ctx.save();

    if (stickerId === "postcard_stamp") {
      // Vintage Circular Postcard Cancellation Stamp (Top Right)
      const cx = w - 68;
      const cy = 68;
      const r = 44;

      ctx.strokeStyle = "rgba(217, 74, 58, 0.88)"; // Journey Red
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
      ctx.stroke();

      // Stamp text
      ctx.fillStyle = "rgba(217, 74, 58, 0.95)";
      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`✈ ${destination}`, cx, cy - 10);
      ctx.font = "bold 8px monospace";
      ctx.fillText(dateStr, cx, cy + 4);
      ctx.font = "8px system-ui, sans-serif";
      ctx.fillText("TRIP POSTAL", cx, cy + 16);

      // Cancellation lines
      ctx.strokeStyle = "rgba(217, 74, 58, 0.65)";
      ctx.lineWidth = 1.5;
      for (let i = -16; i <= 16; i += 8) {
        ctx.beginPath();
        ctx.moveTo(cx - r - 20, cy + i);
        ctx.lineTo(cx - r + 4, cy + i);
        ctx.stroke();
      }
    } else if (stickerId === "passport_seal") {
      // Passport Entry Seal (Bottom Left)
      const bx = 16;
      const by = h - 64;
      const bw = 124;
      const bh = 46;

      ctx.fillStyle = "rgba(23, 24, 23, 0.82)";
      ctx.strokeStyle = "#E9C76B"; // Sun Yellow
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#E9C76B";
      ctx.font = "900 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PASSPORT CONTROL", bx + bw / 2, by + 16);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "700 8px monospace";
      ctx.fillText(`ENTRY · ${destination}`, bx + bw / 2, by + 30);
    } else if (stickerId === "location_badge") {
      // Frosted Location Badge Pill (Bottom Center)
      const label = `📍 ${labelText}`;
      ctx.font = "bold 11px system-ui, sans-serif";
      const textWidth = ctx.measureText(label).width;
      const bw = textWidth + 24;
      const bh = 28;
      const bx = (w - bw) / 2;
      const by = h - 42;

      ctx.fillStyle = "rgba(18, 20, 22, 0.86)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#F4F0E7";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, w / 2, by + bh / 2);
    } else if (stickerId === "wanderlust") {
      // Wanderlust Script Badge (Top Left)
      const bx = 16;
      const by = 16;
      ctx.fillStyle = "#D94A3A"; // Journey Red
      ctx.beginPath();
      ctx.roundRect(bx, by, 110, 26, 13);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "italic 800 11px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✨ Wanderlust", bx + 55, by + 13);
    }

    ctx.restore();
  }

  drawCropOverlay(ctx, w, h, isAvatarMode) {
    ctx.save();

    if (isAvatarMode) {
      const center = w / 2;
      const cropRadius = 120;
      ctx.fillStyle = "rgba(18, 20, 22, 0.72)";
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(center, center, cropRadius, 0, Math.PI * 2, true);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#F4F0E7";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(center, center, cropRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Subtle crop border line for journal mode
      ctx.strokeStyle = "rgba(244, 240, 231, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(8, 8, w - 16, h - 16);
    }

    ctx.restore();
  }

  exportCroppedDataUrl() {
    if (!this.img || !this.img.complete) return null;

    const isAvatarMode = this.state.photoEditorMode === "avatar";
    const outputSize = isAvatarMode ? 512 : 1080;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = outputSize;
    offCanvas.height = outputSize;
    const offCtx = offCanvas.getContext("2d");

    const scaleFactor = outputSize / this.viewportSize;
    const center = outputSize / 2;

    offCtx.save();
    if (isAvatarMode) {
      offCtx.beginPath();
      offCtx.arc(center, center, center, 0, Math.PI * 2);
      offCtx.clip();
    }

    offCtx.fillStyle = "#FFFFFF";
    offCtx.fillRect(0, 0, outputSize, outputSize);

    // Filter
    offCtx.filter = this.getFilterCss();

    // Matrix transforms
    offCtx.translate(center + this.offsetX * scaleFactor, center + this.offsetY * scaleFactor);
    offCtx.rotate((this.rotation * Math.PI) / 180);
    offCtx.scale(this.zoom, this.zoom);

    const aspect = this.img.width / this.img.height;
    let drawW = outputSize;
    let drawH = outputSize;
    if (aspect > 1) {
      drawW = outputSize * aspect;
    } else {
      drawH = outputSize / aspect;
    }

    offCtx.drawImage(this.img, -drawW / 2, -drawH / 2, drawW, drawH);
    offCtx.restore();

    // Draw Stamps/Graphics overlay on export
    if (!isAvatarMode) {
      this.drawStickerOverlay(offCtx, outputSize, outputSize);
    }

    return offCanvas.toDataURL("image/jpeg", 0.90);
  }
}
