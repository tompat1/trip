# Cloudflare Backend Path

Trip Planner Deluxe should move the enrichment system behind a Cloudflare Worker API aligned with `trip.rynell.org`.

## Decision

Use Cloudflare Workers for the API boundary, with:

- D1 for normalized place, fact, source, image, editorial, route and review records.
- KV for short-lived provider health, cache indexes and stale-while-revalidate markers.
- R2 for user uploads, reviewed image derivatives and future generated fallback assets.
- D1 light media for the temporary pre-R2 bucket: small data URLs or text payloads only, capped by the Worker.
- Worker environment bindings for provider credentials.
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

After bindings are configured, move provider calls from the local `enrichmentService` implementation into Worker route handlers while preserving the same `PlaceProfile` contract.

Current deployed health endpoint:

- `https://trip.thomasrynell.workers.dev/api/health`
- API version: `d1-profile-v1`
- D1: ready
- KV: ready
- R2: missing
- D1 light media: ready

Current D1-backed endpoints:

- `POST /api/location/resolve` persists a coordinates-first place profile.
- `POST /api/places/enrich-location` persists a basic `PlaceProfile` with core facts and placeholder editorial.
- `GET /api/places/enrich?id=<placeId>` reads a stored `PlaceProfile`.
- `POST /api/media/light` stores a small D1 light media object.
- `GET /api/media/light/:key` reads a D1 light media object.
