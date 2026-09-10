# FurEver private release status

## September 2026 companion update

- Articulated canvas companion: independent paws, head, feet and tail; six facial states; grounded breathing, blinking, head tracking, stroking, high fives, tickling and distinct care clips.
- Time-based animation with eased transitions, device-pixel-ratio cap, hidden-tab drawing suspension and reduced-motion support. Offline native-canvas compositions were visually inspected; this does not establish browser or phone frame rates.
- Optional local microphone record/replay. Recording stops after 6.5 seconds, on page hide or on unmount. Audio is never uploaded and its object URL is released after playback.
- Warm mint, honey and cream UI with a new moonlit cottage. Entry and onboarding use the same articulated companion.
- Creative Studio key and enabled flag configured in encrypted hosting settings. Image requests use gpt-image-2.5-flare, medium quality, PNG output and private storage. One live Images API request succeeded and its new blue fox was assembled and visually inspected with the production renderer. The complete signed-in game save/selection round trip remains to be verified.
- Real-money checkout closed at the server. Navigation uses Mora exchange; earned Pet Coins and normal shop transactions remain.

## Validation

- 46 automated tests cover motion timing, hit zones, reduced motion, explicit Studio activation, game rules, server authority, uploads, PostgreSQL transactions, reward replay prevention, Mora settlement and historical webhook signatures.
- Strict TypeScript passes; Worker and Next.js builds are required for this update.
- Discord sign-in and persisted player records exist on the private host. Supabase uses four applied migrations and server-only access.
- The owner-provided notification webhook is configured; development did not send a test message.

## Remaining limits

- This is articulated 2D animation, not full 3D animation or complete Talking Tom feature parity. Faces use expression swaps rather than facial deformation or phoneme-driven lips.
- Cat, dog and fusion identities currently share the animated sanctuary character. New custom pet/fusion designs use a generated twelve-part atlas and replace the animated starter on selection. Older portrait-only designs remain saved artwork. The supported body layout is a front-facing chibi companion; unusual anatomy may need another design attempt or authored rigging.
- Real microphone playback, mobile layout/input, animation frame rates and generated-image selection need device/browser verification. Offline rendering and automated tests do not replace these checks.
- Region gameplay, loot and combat are implemented; bespoke biome scenes, enemy rigs and a recorded species sound library remain art work.
- Events are configured by an operator. Analytics, refunds for historical payments, retention jobs and generation recovery tooling are not complete.
- Sites publication currently retains owner-only access. This update does not change the audience or claim the full original vision is ready for a public launch.
