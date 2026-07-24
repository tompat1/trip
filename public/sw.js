const CACHE_NAME = "trip-intelligent-guide-v3";
const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok && isHtmlResponse(response)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (requestUrl.pathname.startsWith("/assets/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!isValidAssetResponse(response, event.request)) {
            return new Response("Asset not found", {
              status: 404,
              headers: { "content-type": "text/plain; charset=utf-8" },
            });
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

function isHtmlResponse(response) {
  return response.headers.get("content-type")?.includes("text/html");
}

function isValidAssetResponse(response, request) {
  if (!response.ok) return false;
  if (isHtmlResponse(response)) return false;

  const contentType = response.headers.get("content-type") || "";
  if (request.destination === "script") {
    return /javascript|ecmascript|wasm/i.test(contentType);
  }
  if (request.destination === "style") {
    return contentType.includes("text/css");
  }
  return true;
}
