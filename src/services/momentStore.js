const DB_NAME = "trip-moments";
const DB_VERSION = 1;
const STORE_NAME = "moments";
const FALLBACK_STORAGE_KEY = "trip_user_moments";

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openMomentDb() {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("indexeddb-unavailable"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("tripId", "tripId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb-open-failed"));
  });
}

function runStoreTransaction(mode, callback) {
  return openMomentDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    try {
      result = callback(store);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(result?.result ?? result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("indexeddb-transaction-failed"));
    };
  }));
}

export async function readStoredMoments() {
  try {
    return await runStoreTransaction("readonly", (store) => store.getAll());
  } catch {
    return readFallbackMoments();
  }
}

export async function saveStoredMoment(moment) {
  if (!moment?.id) return false;
  const normalized = normalizeMomentForStorage(moment);
  try {
    await runStoreTransaction("readwrite", (store) => store.put(normalized));
    return true;
  } catch {
    return writeFallbackMoment(normalized);
  }
}

export async function saveStoredMoments(moments = []) {
  const normalizedMoments = moments.map(normalizeMomentForStorage).filter((moment) => moment.id);
  try {
    await runStoreTransaction("readwrite", (store) => {
      normalizedMoments.forEach((moment) => store.put(moment));
    });
    return true;
  } catch {
    return writeFallbackMoments(normalizedMoments);
  }
}

function normalizeMomentForStorage(moment = {}) {
  return {
    ...moment,
    tripId: moment.tripId || moment.trip_id || "paris",
    createdAt: moment.createdAt || moment.created_at || new Date().toISOString(),
    updatedAt: moment.updatedAt || moment.updated_at || "",
  };
}

function readFallbackMoments() {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
    const moments = stored ? JSON.parse(stored) : [];
    return Array.isArray(moments) ? moments : [];
  } catch {
    return [];
  }
}

function writeFallbackMoment(moment) {
  const moments = readFallbackMoments();
  const index = moments.findIndex((item) => item.id === moment.id);
  if (index >= 0) {
    moments[index] = { ...moments[index], ...moment };
  } else {
    moments.unshift(moment);
  }
  return writeFallbackMoments(moments);
}

function writeFallbackMoments(moments = []) {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(moments));
    return true;
  } catch {
    return false;
  }
}
