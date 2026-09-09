# Initial release status

## Verified locally

- Strict TypeScript compilation.
- Cloudflare Worker production bundle with a default fetch handler.
- Vercel/Next.js production build.
- Game/security unit tests, PostgreSQL integration tests (PGlite) and upload tests, including repeated rewards, atomic rollback, OAuth state consumption, forbidden client database access, Stripe signature validation, repeated fulfillment and repeated Mora approval.
- Local HTTP opening screen and bootstrap endpoint.

## Configured on the private hosted site

- Discord OAuth application, registered callback, client secret and administrator Discord ID.
- Dedicated Supabase database with all four migrations applied; server connection verified over HTTPS.
- Server-only database access. Security advisors report no warnings or errors; browser roles intentionally have no table policies.
- The client now handles expired site access and HTML gateway responses with a recovery message instead of a JSON parser error.
- 35 automated checks pass. The updated production dependency audit reports no known vulnerabilities.

## Still needs configuration or live end-to-end verification

- Owner-completed Discord authorization round trip and a real save/reload session.
- Private Supabase storage if moving to the Vercel adapter. The current Sites host uses R2.
- OpenAI image API account/key and generation quota.
- Stripe test account, signing secret and package review before any live payments.
- Notification delivery to the supplied Discord webhook; no test message was sent during development.
- Device/browser interaction, real OAuth round trip, generated-image selection, payment return/webhook delivery, and mobile performance measurements.

## Art and feature depth still below the full vision brief

- The starter image has a local reaction runtime, not an independently rigged Rive/Live2D/Blender character with skeletal blending, IK and expressive facial deformation. Arbitrary AI images do not become fully rigged characters automatically.
- Cat, dog and fusion choices affect identity/reaction sound, but share starter artwork until generated designs are chosen. Additional production-ready starter rigs and species hit-zone atlases are needed.
- Vocalizations and music are procedural originals, not a full recorded animal-sound library or polished soundtrack. Location-specific score arrangements and event audio packs need additional art/audio work.
- Ten regions have unique unlocks, lore, colors, enemy identities, loot and map positions. Detailed biome-specific exploration scenes, enemy artwork/rigs and chest assets are future asset work.
- The admin interface supports players, grants, suspensions, economy, payments, Mora, logs, config and notification retries. Advanced analytics, refunds/dispute automation, database retention jobs, generation recovery tooling and large-scale operations are not complete.
- Events are data configurable, but new monthly designs/lore/art require an operator. This repository does not promise autonomous monthly content creation.
- Protected-zone handling is intentionally defensive. Production humanoid/fusion rigs need species-specific authored hitboxes and appropriate clothed designs.

The project is a substantive full-stack implementation of the main loop with tested authority boundaries. These remaining items must be completed and verified before claiming the entire 85-section vision is production complete.
