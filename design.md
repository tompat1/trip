# TRIP Brand And Product Design Guide

Source: `/Users/thomasrynell/Downloads/trip_branding_guide.png`  
Version: Brand Guidelines 1.0

## Brand Essence

TRIP is `Travel Planner Deluxe`.

Core line:

```text
Every place becomes a story.
```

Product mantra:

```text
Plan it. Live it. Remember it.
```

The interface should feel cinematic, compact, premium, mobile-first, and useful. It should support real planning, live travel, and memory making without becoming decorative or generic.

## Logo

Primary lockup:
- Large `T R I P` wordmark in dark navy.
- Orange map pin above the `I`.
- Supporting line: `TRAVEL PLANNER DELUXE`.
- Small orange divider marks may flank the descriptor.

Logo assets:
- Light/default logo: `src/assets/trip_logo.svg`
- Dark-theme logo: `src/assets/trip_logo_white.svg`

Usage:
- Use the dark/navy logo on light backgrounds.
- Use the white logo on dark backgrounds.
- Never place the dark logo on dark UI.
- Never place the light logo inside a white rounded card just to make it visible.
- Preserve full logo bounds; do not crop top pin, descriptor, or side spacing.
- Keep logo size stable across themes and pages.
- Use one-color logo only when the surface demands it.

Minimum size:
- Full logo should remain readable at about `120px x 35mm` equivalent.
- In mobile headers, prefer compact but uncropped presentation.

Clear space:
- Preserve a clear area around the logo at least equal to the pin/letter breathing room shown in the guide.
- Do not let status bars, theme toggles, pills, or toolbar icons overlap the logo.

Incorrect usage:
- Do not skew, rotate, recolor randomly, stretch, crop, apply heavy effects, or use low-contrast logo/background combinations.

## Color Palette

Primary:

```css
--trip-ink: #0F1B2B;
--trip-orange: #FF6A00;
--trip-paper: #F4F1E9;
--trip-blue: #385C73;
```

Secondary and accents:

```css
--trip-olive: #65705B;
--trip-gold: #E9C76B;
--trip-clay: #9C6E55;
--trip-slate: #6B7A8F;
--trip-silver: #DDE2E6;
```

Rules:
- Orange is the primary action and brand-energy color.
- Navy/ink anchors typography, dark UI, map surfaces, and premium panels.
- Paper/off-white is the preferred light background.
- Use blue, olive, gold, clay, slate, and silver as supporting semantic accents.
- Avoid one-note palettes. TRIP should not become all orange, all blue, all beige, or all dark slate.
- Dark theme should use the white logo, dark navy surfaces, clear contrast, and restrained orange accents.

## Typography

Primary typeface:
- `Sora`
- Use for UI, labels, buttons, headings, and dense product surfaces.
- Weights: Light, Regular, Medium, Semibold, Bold.

Secondary serif:
- `Playfair Display`
- Use for editorial hero lines, story titles, premium moments, and memory/story surfaces.
- Weights: Regular, Medium, Semibold.

Monospace/accent:
- `IBM Plex Mono`
- Use for small labels, mode tags, technical status, time/date pills, badges, and loading details.
- Weights: Regular, Medium.

Rules:
- Keep letter spacing at `0` for normal UI text.
- Use uppercase mono sparingly for status and section labels.
- Do not scale font sizes directly with viewport width.
- Keep mobile headings compact enough to avoid wrapping chaos.

## Iconography

Icon style:
- Thin-line icons with rounded caps and simple geometry.
- Phosphor Icons (@phosphor-icons/core) is the primary product icon system.

Icon categories from guide:
- Navigation: home, calendar, compass, search, menu.
- Trip and places: suitcase, camera, bookmark, heart, star.
- Map and travel: map pin, navigation arrow, car, transit, ferry/boat.
- Actions: plus, check, edit, upload/share, download, trash.

Rules:
- Use icons in buttons when the action is icon-familiar.
- Pair icon + text for important CTAs.
- Keep header icons visually consistent in size, stroke, and container.
- On mobile, icon targets should stay compact but tappable.

## Imagery

Style:
- Authentic, cinematic, light, natural.
- Focus on real experiences, places, people, movement, food, coffee, maps, and details.
- Avoid generic stock-feeling imagery where the user needs to inspect the actual place/product/state.

Good image subjects:
- Mountains, lakes, roads, islands, city streets.
- Coffee and food rituals.
- Maps, cameras, travel objects.
- Transit views, wings, routes.
- Real place details and companion moments.

Rules:
- Images should be top-aligned or intentionally cropped; avoid accidental cropping.
- Gallery and story media must use real uploaded/captured media where available.
- Admin-only mock media is acceptable for testing templates, but must not appear for non-admin users.
- Loading illustrations should not sit inside a white card/panel unless that is an explicit design choice.

## Brand Patterns And Elements

Map pattern:
- Subtle line-map texture for cards, discovery panels, loading moments, and empty states.
- Keep low contrast; it should support, not compete.

Stamp/label:
- Circular `Explore the world` / TRIP stamp can be used as a premium story/landing marker.

Route line:
- Orange dashed route line with pin and small x marker.
- Use for route cards, live journey signals, onboarding, and travel memory context.

Ribbons:
- Planning, Live, and Remember ribbon assets should indicate trip lifecycle stages.
- Use actual assets from `src/assets`, not recreated CSS approximations.

## UI Components

Buttons:
- Primary buttons use orange fill.
- Secondary buttons use outlined, paper/card surfaces.
- Buttons should have clear states: hover, focus, pressed, disabled.
- Mobile buttons should include subtle touch motion, not only desktop hover.

Cards:
- Use cards for repeated items, modals, and contained tools.
- Avoid nesting cards inside cards.
- Typical radius should be restrained unless a branded asset requires more.

Pills and badges:
- Use compact pills for status, time, filters, personas, and modes.
- Do not let pills dominate the header on mobile.

Header:
- Logo must stay uncropped and stable across landing/app pages and themes.
- Landing header CTA is `Login` with a right arrow.
- The landing `Login` arrow must have a subtle mobile idle nudge animation.
- Respect `prefers-reduced-motion`; the arrow animation must stop when reduced motion is enabled.

Bottom dock:
- Bottom navigation should prioritize core app sections.
- Profile is accessible through the header; bottom dock can prioritize Journal/Story/Trips/Search/Live depending on product direction.

Sheets and drawers:
- Auth, template picker, Quick Capture, and create-trip flows should use clear mobile-first drawer/sheet behavior.
- Avoid dead controls. If a visible control exists, it should either work or clearly explain what wiring is missing.

## Motion

Motion direction:
- Compact, tactile, fluent, and mobile-aware.
- Inspired by transit apps: small shifts, active tab movement, loading choreography, and responsive tap feedback.

Required motion:
- TRIP loader uses vertical airport-display style movement.
- Loader appears on startup and slower page loads.
- Landing mobile CTAs and arrows should move subtly.
- Route/path card should animate enough to feel alive.
- Cards may enter with small vertical movement.

Reduced motion:
- Always include `prefers-reduced-motion` support.
- “Reduced motion” means respecting user accessibility settings; it does not conflict with the overall goal of richer motion.

## Auth And Onboarding

Public surface:
- The landing page is the only unauthenticated app surface.

Landing auth:
- Header CTA: `Login` + animated arrow, opens auth panel in login mode.
- Hero CTA: `Get started`, opens auth panel in sign-up mode.

App access:
- Home, Search, Trips/Plan, Live, Journal/Story, Profile, Quick Capture, and Create Trip require a signed-in `admin` or `traveler`.
- Any route/path into the app without a signed-in session must open the auth panel.
- Do not show logged-in avatar/profile state when signed out.

First registration:
- After first account creation, open onboarding immediately.
- Onboarding must include companion invites, trip creation, Live mode, search/enrichment, and memories/story templates.

Returning visits:
- Returning users should see a clear login path before entering the app.

Forgot password:
- UI should exist in the auth panel.
- Backend email/reset delivery must be wired before claiming reset email is live.

## Media, Journal, And Templates

Gallery:
- Only show usable media with real `mediaUrl` / `media_url`.
- Do not show ghost filename-only images as gallery cards.
- Empty gallery should link directly to Quick Capture.

Templates:
- Flow should be template-first:
  `Choose template -> Pick/confirm gallery moments -> Create story`
- Template picker should preselect recommended moments, but user can override.
- Generated story should use selected moments, not the entire gallery.

Template categories:
- Moments
- Stories
- Guides
- Videos
- Prints

## Accessibility

- Maintain WCAG AA contrast for text and controls.
- Preserve focus states.
- Do not rely on hover for mobile behavior.
- Keep tap targets ergonomic on mobile.
- Do not animate essential information in a way that prevents reading.
- Respect reduced-motion preferences.

