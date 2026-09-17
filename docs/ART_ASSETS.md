# Companion art

Generated September 2026 using imagegen with the existing FurEver companion as an identity/style reference. Exact prompts are in art-prompts.json.

- public/assets/companion-rig.png: 1448 x 1086, twelve parts in a 4 x 3 atlas. Row 1: neutral, happy, blink and surprised heads. Row 2: torso, left arm, right arm and tail. Row 3: sleep head, laugh head, left foot and right foot.
- public/assets/sanctuary-room.webp: 1586 x 992, empty moonlit cottage interior. Served as WebP; it is a full-bleed CSS background under a gradient overlay, so lossy encoding is not visible at display size.

The atlas generator returned a neutral preview matte rather than clean alpha. Original generated PNGs are preserved. The renderer keys only border-connected neutral matte pixels at load time, calculates tight part bounds, and composes the articulated character. Fur and interior highlights remain intact. The starter uses this atlas. New Studio pet/fusion generation requests enforce the same twelve-part layout and preview before selection. Existing portrait-only images have no part map.

## Starlight reference companion

Starlight is an additional selectable look based on the owner-provided white character with galaxy eyes, golden star markings and a navy scarf. It retains the short-paw proportions and all normal interactions. The default Sunbeam companion and selected custom creations remain available from the Home companion picker; changing a look preserves game progress.

The single generated source atlas is public/assets/starlight-rig.png. Its exact prompt is in starlight-prompt.txt. The renderer has authored Starlight trim windows to separate lower-row ear tips from the paw cells. It removes the opaque preview matte at render time and preserves the generated file unchanged.
