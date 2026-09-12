# ASSET_FUREVER v1.0

This folder registers the FurEver visual asset sheet supplied for the game UI.

## Files

- `asset-furever-v1.webp` — lightweight 480×320 repository preview of the asset sheet.
- `asset-furever-v1.json` — pixel-region manifest for the original 1536×1024 source sheet.

## Included asset groups

Branding, dark/light app icons, Pet Coin currency, item icons, Mochi turnaround poses, Mochi expressions, action keyframes, rarity frames, interaction effects, game UI buttons, navigation icons, stat icons, all 10 world thumbnails, loading-screen artwork, promotional banners, environmental props, and app/favicon artwork.

## Production usage

The original 1536×1024 uploaded sheet remains the visual source of truth. The WebP in this folder is an optimized preview. Region coordinates in the JSON manifest refer to the original 1536×1024 sheet.

For production UI, extract the required icon, pose, location thumbnail, button, or effect into its own optimized PNG/WebP/AVIF asset rather than loading the complete sheet at runtime.
