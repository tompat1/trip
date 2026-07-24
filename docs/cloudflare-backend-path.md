# Cloudflare Backend Path

Trip Planner Deluxe should move the enrichment system behind a Cloudflare Worker API aligned with `trip.rynell.org`.

## Decision

Use Cloudflare Workers for the API boundary, with:

- D1 for normalized place, fact, source, image, editorial, route and review records.
- KV for short-lived provider health, cache indexes and stale-while-revalidate markers.
- R2 for user uploads, reviewed image derivatives and future generated fallback assets.
- D1 light media for the temporary pre-R2 bucket: small data URLs or text payloads only, capped by the Worker.
- Worker environment bindings for provider credentials.
- `TRIP_ADMIN_TOKEN` Worker secret for the first lightweight admin boundary until a real auth provider is chosen.
- Static Vite assets served separately by the existing deployment path until a single Worker asset deployment is ready.

## Why

- Keeps API keys server-side.
- Matches the production Cloudflare deployment already documented in this repo.
- Gives us edge-friendly provider timeouts and graceful degradation.
- Lets the current frontend call one normalized enrichment API without knowing provider details.
- Gives the future admin review workflow a durable database and object storage target.

## API Boundary

The frontend should call these Worker routes once implemented:

- `POST /api/location/resolve`
- `GET /api/session`
- `GET /api/places/nearby`
- `POST /api/places/enrich-location`
- `GET /api/places/enrich`
- `POST /api/places/:id/media/refresh`
- `POST /api/places/:id/editorial/generate`
- `PATCH /api/place-images/:id`
- `POST /api/places/:id/hero/lock`
- `GET /api/places/:id/attributions`

Until the Worker is implemented, `src/enrichment/enrichmentService.js` is the local facade. The UI should depend on that service rather than importing provider modules directly.

## Data Stores

Initial D1 tables should follow the package plan:

- `places`
- `place_aliases`
- `place_facts`
- `place_images`
- `place_editorial_profiles`
- `place_sources`
- `routes`
- `route_places`
- `media_reviews`

R2 should store only objects we are allowed to persist: user uploads, reviewed derivatives, and generated UI fallback assets. Third-party images should keep provider URLs and attribution records unless licence and provider terms allow storage.

Until R2 is enabled, the Worker exposes a temporary D1-backed light media bucket:

- `POST /api/media/light`
- `GET /api/media/light/:key`

This is for small payloads and metadata only. It is not a long-term object store and should be migrated to R2 when `TRIP_MEDIA` is available.

## Provider Policy

Allowed first providers:

- OpenStreetMap / Overpass
- Nominatim or configured geocoder
- Wikidata
- Wikimedia Commons
- Openverse
- optional official tourism/open-data adapters
- optional Unsplash/Pexels only with server-side credentials

Do not scrape Google Maps, TripAdvisor, Instagram, Facebook, booking platforms, protected review sites, CAPTCHA-protected pages, or authenticated surfaces.

## Next Implementation Step

The Worker API scaffold now lives in `worker/index.js` and the first D1 migrations live in `migrations/`.

Before enabling persistent storage in production:

1. Create the D1 database. Done: `trip`.
2. Apply `migrations/0001_enrichment_foundation.sql`. Done.
3. Apply `migrations/0002_provider_health.sql`. Done.
4. Create the KV namespace for provider/cache state. Done: `TRIP_CACHE`.
5. Create the R2 bucket for allowed uploads and reviewed derivatives. Blocked until R2 is enabled in the Cloudflare Dashboard.
6. Add the real binding IDs to `wrangler.jsonc`. Done for D1/KV; pending for R2.
7. Apply `migrations/0003_d1_light_media_bucket.sql`. Done when the temporary D1 light media bucket is needed.
8. Apply `migrations/0004_seed_crete_poi_cache.sql`. Done as a temporary curated Heraklion POI fallback while live providers are hardened.
9. Apply `migrations/0005_seed_crete_poi_facts.sql`. Done so temporary curated POIs return useful D1 fact rows through `GET /api/places/enrich`.

After bindings are configured, move provider calls from the local `enrichmentService` implementation into Worker route handlers while preserving the same `PlaceProfile` contract.

Current service-boundary migrations:

- Roles/session: the Worker recognizes `anonymous`, `traveler` and `admin` principals. `GET /api/session` exposes the current role. `PATCH /api/place-images/:id` and `POST /api/places/:id/hero/lock` now require admin. This is a lightweight token/header boundary, not a full user account system.
- Location resolve: `collectAreaData()` calls `enrichmentService.resolveLocation()`, which calls `POST /api/location/resolve` first and falls back to the local resolver if the Worker is unavailable.
- Nearby discovery: `src/main.js` calls `enrichmentService.discoverNearby()`, which calls the Worker first and keeps the browser Overpass path as fallback.
- Media refresh: `src/main.js` calls `enrichmentService.refreshMedia()`, which calls `POST /api/places/:id/media/refresh` first. The Worker now checks reviewed D1 images, curated/client media, then the server-side media provider router: Wikimedia Commons/Wikidata plus Openverse, with D1 `place_images` persistence. Passing `refresh=1` or `{ "force": true }` bypasses stored D1 images for a live recheck, then falls back to stored media if the live pass is empty. The local media aggregator remains as a browser fallback when the Worker is unavailable or only returns designed fallback media.
- Editorial generation: `enrichmentService.generateEditorial()` calls `POST /api/places/:id/editorial/generate` first and falls back to the local deterministic composer if the Worker is unavailable. The synchronous `composeEditorial()` path remains available for instant render-time copy.
- Place profile enrichment: `enrichmentService.enrichPlace()` calls `GET /api/places/enrich?id=...` first and falls back to the local profile composer when D1 only has a coordinates-only shell.

Current deployed health endpoint:

- `https://trip.thomasrynell.workers.dev/api/health`
- API version: `overpass-nearby-v1`
- D1: ready
- KV: ready
- R2: missing
- D1 light media: ready

Current D1-backed endpoints:

- `GET /api/session` returns the current principal role and capability flags.
- `POST /api/location/resolve` reverse-geocodes coordinates through Nominatim, persists a place profile, source row and core facts.
- `GET /api/places/nearby` returns normalized nearby places for `lat`, `lng`, `radius` and `intent`.
  - Default behavior is stale-while-revalidate: if D1 has POIs near the coordinates, it returns them immediately and refreshes Overpass in the background.
  - Add `refresh=1` to force a live Overpass attempt before falling back to D1.
  - Provider status reports `overpass`, `d1-nearby-cache` and storage separately so the UI can show whether data is live or cached.
  - The current temporary seed contains curated Heraklion POIs from `src/data/creteSeed.js`: Lions Square, Peskesi, Venetian Walls, Heraklion Archaeological Museum, Koules Fortress and Ammoudara Beach.
- `POST /api/places/enrich-location` persists a basic `PlaceProfile` with core facts and placeholder editorial.
- `GET /api/places/enrich?id=<placeId>` reads a stored `PlaceProfile`.
- `POST /api/places/:id/media/refresh` returns reviewed D1 images when available, otherwise accepts curated/client place media such as `/assets/...` seed images, otherwise runs the server-side media provider router, persists candidates to `place_images`, and only then returns designed fallback media. Add `refresh=1` or body `force: true` to bypass D1 for a fresh provider pass.
- `POST /api/places/:id/editorial/generate` creates deterministic editorial from submitted place, facts, media and traveller/route context, upserts the place if needed, and persists the editorial profile to D1.
- `POST /api/media/light` stores a small D1 light media object.
- `GET /api/media/light/:key` reads a D1 light media object.

Known provider note:

- Public Overpass endpoints can time out from Cloudflare or under load. The Worker now avoids blocking the UI on those provider waits when cached POIs are available.
- Wikimedia Commons media refresh is now server-side for the Worker route. Verified with Koules Fortress: first refresh found/persisted Commons candidates; subsequent refresh returned `d1-place-images` with a Commons hero and gallery.
