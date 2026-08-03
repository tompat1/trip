/**
 * ProfilePhotoEditorModal.js — Substack-style Profile Photo Editor
 * Features:
 * - Interactive Canvas Viewport with circular crop mask overlay
 * - Mouse & Touch Drag (Pan)
 * - Zoom slider & pinch-zoom (1.0x - 3.0x)
 * - 90-degree Rotation controls & Reset
 * - Travel Avatar Presets picker tab
 * - High-DPI compressed export (512x512 JPEG/WebP)
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

export function renderProfilePhotoEditorModal(state) {
  if (!state.photoEditorOpen) return "";

  const isSignup = Boolean(state.photoEditorIsSignup);
  const currentAvatar = state.photoEditorImageSrc || state.userAvatar || TRAVEL_AVATAR_PRESETS[0].url;

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
            <span class="photo-editor-icon">${renderIcon("camera")}</span>
            <div>
              <h3 id="photo-editor-title" class="photo-editor-title">${isSignup ? "Welcome! Add Profile Photo" : "Edit Profile Photo"}</h3>
              <p class="photo-editor-subtitle">${isSignup ? "Personalize your traveler account with a custom photo or preset" : "Drag to reposition, scale, or rotate your avatar photo"}</p>
            </div>
          </div>
          <button class="photo-editor-close-btn" data-action="close-photo-editor" type="button" aria-label="${isSignup ? "Skip photo setup" : "Close editor"}">
            ${renderIcon("x")}
          </button>
        </div>

        <!-- Mode Navigation Tabs -->
        <div class="photo-editor-tabs">
          <button class="photo-editor-tab ${state._photoEditorTab !== "presets" ? "active" : ""}" data-action="set-photo-editor-tab" data-tab="upload" type="button">
            ${renderIcon("image")} Custom Photo
          </button>
          <button class="photo-editor-tab ${state._photoEditorTab === "presets" ? "active" : ""}" data-action="set-photo-editor-tab" data-tab="presets" type="button">
            ${renderIcon("sparkles")} Travel Presets
          </button>
        </div>

        <!-- Tab 1: Interactive Canvas Crop Area -->
        <div class="photo-editor-body ${state._photoEditorTab === "presets" ? "photo-editor-body--hidden" : ""}">
          <div class="photo-editor-canvas-container" id="photo-canvas-viewport">
            <canvas id="photo-editor-canvas" width="320" height="320" aria-label="Photo editor canvas"></canvas>
            <input type="file" id="photo-editor-file-input" accept="image/*" style="display:none;" />
          </div>

          <!-- Controls Bar -->
          <div class="photo-editor-controls">
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

          <!-- Direct Upload Secondary Trigger -->
          <div class="photo-editor-upload-bar">
            <button class="btn btn--secondary btn--sm" data-action="trigger-photo-file-upload" type="button">
              ${renderIcon("upload")} Upload Different Image...
            </button>
          </div>
        </div>

        <!-- Tab 2: Travel Presets Grid -->
        <div class="photo-editor-presets-body ${state._photoEditorTab === "presets" ? "" : "photo-editor-body--hidden"}">
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

        <!-- Footer Actions -->
        <div class="photo-editor-footer">
          <button class="btn btn--ghost text-danger btn--sm" data-action="remove-photo-avatar" type="button">
            ${renderIcon("trash2")} Remove Photo
          </button>
          <div class="photo-editor-footer-right">
            <button class="btn btn--secondary btn--sm" data-action="close-photo-editor" type="button">
              ${isSignup ? "Skip for now" : "Cancel"}
            </button>
            <button class="btn btn--primary btn--sm photo-editor-save-btn" id="btn-save-photo-editor" type="button">
              ${renderIcon("check")} ${isSignup ? "Save & Continue" : "Save Profile Photo"}
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
    this.cropRadius = 120; // 240px diameter crop circle
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
    this.img.src = imageSrc || this.state.userAvatar || TRAVEL_AVATAR_PRESETS[0].url;

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

  render() {
    if (!this.ctx || !this.img || !this.img.complete) return;
    const w = this.viewportSize;
    const h = this.viewportSize;
    const center = w / 2;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Draw transformed image
    this.ctx.save();
    this.ctx.translate(center + this.offsetX, center + this.offsetY);
    this.ctx.rotate((this.rotation * Math.PI) / 180);
    this.ctx.scale(this.zoom, this.zoom);

    // Calculate base draw size keeping aspect ratio fitted to crop circle
    const aspect = this.img.width / this.img.height;
    let drawW, drawH;
    if (aspect > 1) {
      drawH = this.cropRadius * 2;
      drawW = drawH * aspect;
    } else {
      drawW = this.cropRadius * 2;
      drawH = drawW / aspect;
    }

    this.ctx.drawImage(this.img, -drawW / 2, -drawH / 2, drawW, drawH);
    this.ctx.restore();

    // 2. Draw circular crop mask overlay
    this.ctx.save();
    // Fill entire canvas with translucent dark mask
    this.ctx.fillStyle = "rgba(18, 20, 22, 0.72)";
    this.ctx.fillRect(0, 0, w, h);

    // Clear out circle viewport
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.beginPath();
    this.ctx.arc(center, center, this.cropRadius, 0, Math.PI * 2, true);
    this.ctx.fill();

    // Reset composite operation to draw ring line
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.strokeStyle = "#F4F0E7";
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(center, center, this.cropRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner dashed guide ring
    this.ctx.strokeStyle = "rgba(217, 74, 58, 0.6)";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.stroke();

    this.ctx.restore();
  }

  exportCroppedDataUrl() {
    if (!this.img || !this.img.complete) return null;

    const outputSize = 512;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = outputSize;
    offCanvas.height = outputSize;
    const offCtx = offCanvas.getContext("2d");

    const scaleFactor = outputSize / (this.cropRadius * 2); // 512 / 240
    const center = outputSize / 2;

    offCtx.save();
    // Create circular clip path for exported canvas
    offCtx.beginPath();
    offCtx.arc(center, center, center, 0, Math.PI * 2);
    offCtx.clip();

    // Background fill (white/paper)
    offCtx.fillStyle = "#FFFFFF";
    offCtx.fillRect(0, 0, outputSize, outputSize);

    // Apply exact transforms scaled up to 512x512
    offCtx.translate(center + this.offsetX * scaleFactor, center + this.offsetY * scaleFactor);
    offCtx.rotate((this.rotation * Math.PI) / 180);
    offCtx.scale(this.zoom, this.zoom);

    const aspect = this.img.width / this.img.height;
    let drawW, drawH;
    if (aspect > 1) {
      drawH = outputSize;
      drawW = drawH * aspect;
    } else {
      drawW = outputSize;
      drawH = drawW / aspect;
    }

    offCtx.drawImage(this.img, -drawW / 2, -drawH / 2, drawW, drawH);
    offCtx.restore();

    return offCanvas.toDataURL("image/jpeg", 0.88);
  }
}
