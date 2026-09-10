# Companion art

Generated September 2026 using imagegen with the existing FurEver companion as an identity/style reference. Exact prompts are in art-prompts.json.

- public/assets/companion-rig.png: 1448 x 1086, twelve parts in a 4 x 3 atlas. Row 1: neutral, happy, blink and surprised heads. Row 2: torso, left arm, right arm and tail. Row 3: sleep head, laugh head, left foot and right foot.
- public/assets/sanctuary-room.png: 1586 x 992, empty moonlit cottage interior.

The atlas generator returned a neutral preview matte rather than clean alpha. Original generated PNGs are preserved. The renderer keys only border-connected neutral matte pixels at load time, calculates tight part bounds, and composes the articulated character. Fur and interior highlights remain intact. The starter uses this atlas. New Studio pet/fusion generation requests enforce the same twelve-part layout and preview before selection. Existing portrait-only images have no part map.
