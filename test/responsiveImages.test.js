import test from "node:test";
import assert from "node:assert/strict";
import { getOptimizedImageUrl, getResponsiveSrcset, renderResponsiveImgAttributes } from "../src/utils/responsiveImages.js";

test("responsiveImages: getOptimizedImageUrl transforms Unsplash URLs", () => {
  const original = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-1.2.1";
  const optimized = getOptimizedImageUrl(original, { width: 400, quality: 80 });

  assert.ok(optimized.includes("w=400"));
  assert.ok(optimized.includes("q=80"));
  assert.ok(optimized.includes("auto=format"));
  assert.ok(optimized.includes("fit=crop"));
});

test("responsiveImages: getOptimizedImageUrl transforms Wikimedia thumb URLs", () => {
  const original = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Eiffel_Tower.jpg/300px-Eiffel_Tower.jpg";
  const optimized = getOptimizedImageUrl(original, { width: 600 });

  assert.equal(optimized, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Eiffel_Tower.jpg/600px-Eiffel_Tower.jpg");
});

test("responsiveImages: getResponsiveSrcset produces correct width descriptors", () => {
  const original = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34";
  const srcset = getResponsiveSrcset(original, [400, 800]);

  assert.ok(srcset.includes("w=400"));
  assert.ok(srcset.includes("400w"));
  assert.ok(srcset.includes("w=800"));
  assert.ok(srcset.includes("800w"));
});

test("responsiveImages: renderResponsiveImgAttributes outputs valid HTML attributes", () => {
  const original = "https://images.unsplash.com/photo-1502602898657-3e91760cbb34";
  const attrs = renderResponsiveImgAttributes(original, {
    alt: "Eiffel Tower",
    loading: "lazy",
    fetchpriority: "high",
    width: 800,
    height: 600,
  });

  assert.ok(attrs.includes('alt="Eiffel Tower"'));
  assert.ok(attrs.includes('loading="lazy"'));
  assert.ok(attrs.includes('fetchpriority="high"'));
  assert.ok(attrs.includes('width="800"'));
  assert.ok(attrs.includes('height="600"'));
  assert.ok(attrs.includes('srcset="'));
});
