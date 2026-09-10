export function companionDesignPrompt(description: string) {
  return `Production animation sprite atlas for FurEver, a cozy pet game.
Character direction: ${description}
Render the requested character as one consistent friendly chibi upright companion, with a large expressive head, a compact torso, two SHORT forearms/paws, two feet and a tail. Family-friendly; humanoid characters must be fully clothed. Preserve identity from the reference image when provided. Soft volumetric animated-game art, clean silhouettes and matching lighting.
CRITICAL OUTPUT CONTRACT: exactly FOUR columns and THREE rows of equal invisible cells in a landscape image. Every cell contains exactly ONE isolated cutout, centered with 12% empty padding. Never cross a cell boundary. No complete characters, no duplicated body parts inside a cutout. Transparent alpha background, no painted checkerboard, no floor, no shadows, labels, lines or text.
Row 1, left to right: (1) FRONT-FACING HEAD ONLY, neutral, open eyes, mouth closed; (2) identical head, happy closed eyes and closed-mouth smile; (3) identical head, blinking closed eyes, neutral closed mouth; (4) identical head, surprised open eyes and small O mouth.
Row 2: (1) TORSO ONLY, neck stub and small pendant, NO head/arms/feet/tail; (2) isolated LEFT short forearm with paw at bottom, shoulder root at top, pointing down; (3) matching RIGHT short forearm; (4) isolated fluffy curved tail, root near lower left.
Row 3: (1) same HEAD ONLY sleeping with closed eyes; (2) same HEAD ONLY laughing with open smiling mouth; (3) isolated LEFT foot; (4) isolated RIGHT foot.
All six heads have EXACTLY the same front-facing position, scale, proportions, ear shape and silhouette alignment; ONLY facial expression changes. Eyes must stay on the head, not float separately. Each part is complete and separate with clean alpha edges. No neck below heads. Limbs must be short, plush and rounded, never long human arms. Fit the requested design to this animation layout.`;
}
