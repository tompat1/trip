# TRIP Design Notes

## Landing Authentication

- The landing header CTA must read `Login`, include a right-arrow icon, and open the auth panel in login mode.
- On mobile, the `Login` arrow should have a subtle idle nudge animation to signal entry. Keep the animation small, horizontal, and touch-friendly.
- Respect `prefers-reduced-motion`; the arrow animation must stop when reduced motion is enabled.
- The landing hero `Get started` CTA opens the auth panel in sign-up mode.
- The public landing page is the only unauthenticated app surface. Any path into Home, Search, Trips, Live, Journal, Profile, Quick Capture, or Create Trip must require a signed-in `admin` or `traveler` session.

