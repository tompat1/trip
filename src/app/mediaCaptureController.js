import { state } from "../state.js";
import { enrichmentService } from "../enrichment/enrichmentService.js";
import { inferMomentCategory } from "./journalController.js";

export async function enrichCapturedMediaFile(file, trip) {
  const coordinates = await extractPhotoGpsCoordinates(file);
  if (!coordinates) {
    return {
      tags: ["Needs place tag"],
      geoSource: "manual-needed",
      geoLabel: "",
    };
  }

  const [location, nearby] = await Promise.all([
    enrichmentService.resolveLocation({ coordinates }).catch(() => null),
    enrichmentService.discoverNearby({
      coordinates,
      radiusMeters: 180,
      personas: Array.from(state.userPreferences || []),
    }).catch(() => null),
  ]);
  const place = (nearby?.places || [])[0] || null;
  const geoLabel = location?.locality || location?.area?.city || location?.area?.town || location?.displayName || "";
  const placeCategory = place?.category || place?.tag || inferMomentCategory(place?.categories || []);

  return {
    coordinates,
    geoSource: "photo-exif",
    geoLabel: geoLabel || trip.destination,
    placeTitle: place?.title || place?.canonicalName || "",
    placeCategory: placeCategory || "",
    placeDistance: place?.distance || "",
    tags: [placeCategory, geoLabel || trip.destination].filter(Boolean),
    locationResolved: location || null,
  };
}

export function readFileAsDataUrl(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      onProgress(evt.loaded / evt.total);
    };
    reader.onload = (evt) => resolve(evt.target.result);
    reader.onerror = () => reject(reader.error || new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

export function createMediaGroup(files = [], receiverTrip) {
  const timestamp = new Date();
  return {
    groupId: `media_group_${timestamp.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    groupTitle: `${receiverTrip.destination} media batch`,
    capturedAt: timestamp.toISOString(),
    fileCount: files.length,
  };
}

export function buildGroupedMomentTitle(file, selectedType, index, total, group) {
  if (total <= 1) return `Captured ${selectedType === "video" ? "Video" : "Photo"}`;
  const base = group.groupTitle || "Media batch";
  return `${base} ${index + 1}/${total}`;
}

export function summarizeMediaGroup(moments = [], fallbackTrip) {
  const place = moments.find((moment) => moment.placeTitle)?.placeTitle;
  const geo = moments.find((moment) => moment.geoLabel)?.geoLabel;
  const category = moments.find((moment) => moment.placeCategory)?.placeCategory;
  return {
    groupPlaceTitle: place || "",
    groupGeoLabel: geo || fallbackTrip.destination,
    groupCategory: category || "",
  };
}

async function extractPhotoGpsCoordinates(file) {
  if (!file || !/^image\/jpe?g$/i.test(file.type || "")) return null;
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    const length = view.getUint16(offset + 2, false);
    if (marker === 0xffe1 && length > 8 && readAscii(view, offset + 4, 6) === "Exif\0\0") {
      return readGpsFromTiff(view, offset + 10);
    }
    offset += 2 + length;
  }
  return null;
}

function readGpsFromTiff(view, tiffStart) {
  const little = readAscii(view, tiffStart, 2) === "II";
  const get32 = (offset) => view.getUint32(offset, little);
  const firstIfd = tiffStart + get32(tiffStart + 4);
  const gpsPointer = findIfdValue(view, firstIfd, 0x8825, little, tiffStart);
  if (!gpsPointer) return null;

  const gpsIfd = tiffStart + gpsPointer;
  const latRef = findIfdValue(view, gpsIfd, 0x0001, little, tiffStart);
  const lat = findIfdValue(view, gpsIfd, 0x0002, little, tiffStart);
  const lngRef = findIfdValue(view, gpsIfd, 0x0003, little, tiffStart);
  const lng = findIfdValue(view, gpsIfd, 0x0004, little, tiffStart);
  if (!lat || !lng) return null;

  const latitude = dmsToDecimal(lat) * (String(latRef).toUpperCase().startsWith("S") ? -1 : 1);
  const longitude = dmsToDecimal(lng) * (String(lngRef).toUpperCase().startsWith("W") ? -1 : 1);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [Number(latitude.toFixed(6)), Number(longitude.toFixed(6))];
}

function findIfdValue(view, ifdOffset, tag, little, tiffStart) {
  const get16 = (offset) => view.getUint16(offset, little);
  const get32 = (offset) => view.getUint32(offset, little);
  const entries = get16(ifdOffset);
  for (let i = 0; i < entries; i += 1) {
    const entry = ifdOffset + 2 + i * 12;
    if (get16(entry) !== tag) continue;
    const type = get16(entry + 2);
    const count = get32(entry + 4);
    const valueOffset = entry + 8;
    const dataOffset = getTypeSize(type) * count <= 4 ? valueOffset : tiffStart + get32(valueOffset);
    return readExifValue(view, dataOffset, type, count, little);
  }
  return null;
}

function readExifValue(view, offset, type, count, little) {
  if (type === 2) return readAscii(view, offset, count).replace(/\0/g, "");
  if (type === 3) return count === 1 ? view.getUint16(offset, little) : Array.from({ length: count }, (_, i) => view.getUint16(offset + i * 2, little));
  if (type === 4) return count === 1 ? view.getUint32(offset, little) : Array.from({ length: count }, (_, i) => view.getUint32(offset + i * 4, little));
  if (type === 5) {
    return Array.from({ length: count }, (_, i) => {
      const numerator = view.getUint32(offset + i * 8, little);
      const denominator = view.getUint32(offset + i * 8 + 4, little) || 1;
      return numerator / denominator;
    });
  }
  return null;
}

function getTypeSize(type) {
  if (type === 2) return 1;
  if (type === 3) return 2;
  if (type === 4) return 4;
  if (type === 5) return 8;
  return 1;
}

function readAscii(view, offset, length) {
  return Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join("");
}

function dmsToDecimal(values) {
  return Number(values[0] || 0) + Number(values[1] || 0) / 60 + Number(values[2] || 0) / 3600;
}
