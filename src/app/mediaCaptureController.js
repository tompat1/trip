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

export async function handleQuickCaptureFiles(fileList, { showToast = () => {} } = {}) {
  const files = Array.from(fileList || []).filter((file) => /^(image|video)\//.test(file.type || ""));
  if (!files.length) return false;

  const receiverTripId = state.quickCaptureTripId || state.activeTripId;
  const receiverTrip = state.getAllTrips().find((trip) => trip.id === receiverTripId) || state.activeTrip;
  const group = createMediaGroup(files, receiverTrip);
  const savedMoments = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const selectedType = file.type.startsWith("video") ? "video" : "photo";
    const progressLabel = files.length > 1 ? `${file.name} (${index + 1}/${files.length})` : file.name;
    const baseProgress = Math.max(8, Math.round((index / files.length) * 92));

    state.setQuickCaptureUpload({
      status: "reading",
      progress: baseProgress,
      fileName: progressLabel,
      type: selectedType,
    });

    try {
      const dataUrl = await readFileAsDataUrl(file, (ratio) => {
        const progress = Math.min(92, Math.max(8, Math.round(((index + ratio) / files.length) * 92)));
        state.setQuickCaptureUpload({
          status: "reading",
          progress,
          fileName: progressLabel,
          type: selectedType,
        });
      });

      state.setQuickCaptureUpload({
        status: "saving",
        progress: Math.min(98, Math.max(10, Math.round(((index + 0.96) / files.length) * 100))),
        fileName: progressLabel,
        type: selectedType,
      });

      const enrichment = selectedType === "photo"
        ? await enrichCapturedMediaFile(file, receiverTrip).catch(() => ({ tags: ["Needs place tag"], geoSource: "manual-needed" }))
        : { tags: ["Video"], geoSource: "video" };

      const momentPayload = {
        tripId: receiverTripId,
        groupId: group.groupId,
        groupTitle: group.groupTitle,
        groupCapturedAt: group.capturedAt,
        groupFileCount: group.fileCount,
        title: buildGroupedMomentTitle(file, selectedType, index, files.length, group),
        text: file.name,
        type: selectedType,
        media_url: dataUrl,
        ...enrichment,
      };

      if (selectedType === "photo" && index === 0) {
        state.setQuickCaptureUpload({ status: "idle", progress: 100, fileName: "", type: "" });
        state.openJournalPhotoEditor(dataUrl, {
          mode: "quick_capture",
          momentData: momentPayload,
          caption: enrichment.placeTitle || enrichment.geoLabel || "",
        });
        showToast("📸 Photo ready! Add travel stamps & graphics below.");
        return true;
      }

      const savedMoment = await state.addMoment(momentPayload);
      savedMoments.push(savedMoment);
    } catch {
      state.setQuickCaptureUpload({
        status: "error",
        progress: 100,
        fileName: file.name,
        type: selectedType,
      });
      showToast(`Could not read ${file.name}.`);
    }
  }

  if (savedMoments.length) {
    const groupSummary = summarizeMediaGroup(savedMoments, receiverTrip);
    const resolvedGroupTitle = groupSummary.groupPlaceTitle
      ? `${groupSummary.groupPlaceTitle} media`
      : `${groupSummary.groupGeoLabel || receiverTrip.destination} media`;

    savedMoments.forEach((moment) => {
      state.updateMoment(moment.id, {
        ...groupSummary,
        groupTitle: files.length > 1 ? resolvedGroupTitle : moment.groupTitle,
      });
    });

    state.setQuickCaptureUpload({
      status: "complete",
      progress: 100,
      fileName: files.length > 1 ? `${savedMoments.length} media saved` : files[0].name,
      type: files.length > 1 ? "batch" : savedMoments[0].type,
    });
    showToast(files.length > 1
      ? `${savedMoments.length} media saved to ${receiverTrip.destination} Journal.`
      : `${files[0].name} saved to ${receiverTrip.destination} Journal.`);
    setTimeout(() => state.toggleQuickCapture(false), 650);
  }

  return true;
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
