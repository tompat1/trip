# Cloudflare Backend Path

Trip Planner Deluxe should move the enrichment system behind a Cloudflare Worker API aligned with `trip.rynell.org`.

## Decision

Use Cloudflare Workers for the API boundary, with:

- D1 for normalized place, fact, source, image, editorial, route and review records.
- KV for short-lived provider health, cache indexes and stale-while-revalidate markers.
- R2 for user uploads, reviewed image derivatives and future generated fallback assets.
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

Create the Worker API scaffold and D1 migration files, then move provider calls from the local `enrichmentService` implementation into Worker route handlers while preserving the same `PlaceProfile` contract.
