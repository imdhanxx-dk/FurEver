# Minigame research

Reference notes for choosing the next minigames. Nothing here is implemented; it
records what already exists, what the server architecture will and will not
accept, which established games fit, and the licensing line for art.

Compiled September 2026.

## What is already built

| Game | Kind | Status |
| --- | --- | --- |
| Cloud-soft grooming | `minigame_start` / `minigame_hit`, `kind: 'grooming'` | Live |
| Starlight catch | same handlers, `kind: 'play'` | **Built server-side, not rendered** |
| Kitten Drop | `kitten_start` / `kitten_drop` / `kitten_finish` | Live |

`Starlight catch` is fully handled in `lib/game/engine.ts` and its reward is
configured (`playCoins`), but `components/game/Adventure.tsx` renders only
`(['grooming'] as const)`, so the player never sees it. Adding `'play'` to that
array exposes a complete second minigame.

Every rewarded game is capped at `minigameLimit` (default 5) completions per kind
per UTC day, and pays `PC` + 60 `XP` + happiness and bond.

## What the server will accept

Progression is server-authoritative, so a minigame is only viable if the server
can decide the outcome without trusting the browser. Two patterns already exist.

### Pattern A — server generates a sequence, validates each step

Used by grooming and catch. `minigame_start` builds
`targets: Array.from({ length: 10 }, () => rand(0, 8))` and stores a
`{ id, nonce, kind, started, expires, step, targets, lastStep }` challenge.
`publicState` in `lib/server/game-service.ts` masks every target except the
current step, so the client cannot read ahead. `minigame_hit` checks the nonce,
the expiry, that `intent.step` matches the server's step, that at least 500 ms
passed since the last step, and that the whole run took at least 5 s.

Suits: memory sequences, pair matching, target timing, rhythm taps, anything
expressible as "the server knows the answer, the client proves it found it".

### Pattern B — server runs deterministic physics, client replays

Used by Kitten Drop. The client sends only an aim value; `dropKitten` in
`lib/game/kitten-drop.ts` runs fixed-step physics on the server and the browser
replays the identical simulation for animation. The server alone chooses the next
kitten and awards currency.

Suits: falling/catching, trajectory and launch games, tap-to-fly — anything where
the client can send a compact input timeline (positions, tap timestamps) that the
server replays to derive the score.

### What does not fit

Continuous unverifiable input — a true platformer, a reflex racer, free-aim
action. These need either a new anti-cheat model or client-trusted scoring, which
the project deliberately does not do.

## Candidates

Ranked by fit and build cost, not popularity alone.

### 1. Birdsong echo — call-and-response memory sequence

The Simon mechanic. Pattern A, almost exactly the existing grooming shape: the
server generates a tone order and reveals one step at a time.

There is already a precedent in the world layer — `engine.ts` has a "tangled echo"
challenge tracking `w.challenge.nodes` with "3 tones answered" messaging. Audio is
already procedural in `lib/client/audio.ts`.

Art cost: none. Glowing perches drawn on canvas in the existing palette.

### 2. Memory match / pairs

The staple of pet sites; Neopets runs 80+ minigames and Webkinz built Kinzville
Academy around this category. Pattern A: the server generates the layout and
validates each flip, never sending unflipped cards.

Art cost: near none. Reuse regions from
`public/assets/asset-furever/regions/item-icons.webp`.

### 3. Expose Starlight catch

See above. One line.

### 4. Falling-treat catch

Pattern B. The client sends basket-position samples, the server replays and
scores. Fits the existing "Play together" framing.

Art cost: small; treats can reuse existing item icons.

### 5. Nonogram revealing an animal

The most server-verifiable option on this list: the client submits one final grid
and the server checks a single answer, with no timing tolerance and no anti-cheat
surface at all.

Art cost: none. It is a grid.

### 6. Bird flight through gaps

The tap-to-fly loop that made Flappy Bird a sleeper hit. Pattern B works — the
client sends tap timestamps and the server replays deterministic physics. Higher
art and tuning cost than the others, and see the naming caution below.

### Not a minigame, but worth considering

Neko Atsume's loop — leave out food and toys, close the game, return later to see
which cats visited — works on anticipation and collection rather than skill. That
is an idle system for the Companions and Collection screens, and it would suit the
existing daily-login and streak structure.

For reference on the direction already taken: Suika Game's publisher attributes
its success to "cute and friendly art that appeals to a wide audience" plus simple
rules. It sold over 5 million copies and spawned a large number of web clones.
Kitten Drop is built on a proven shape.

## Art and licensing

The working rule: **implement the mechanic, never the expression.**

Game rules and mechanics are broadly not protected by copyright. The specific art,
characters, names, music and distinctive visual identity are, and names are often
trademarked on top. A tap-to-fly bird game is fine; copying that game's bird and
pipes is not.

Names to avoid entirely, including in code, UI copy and commit messages: Flappy
Bird, Suika, Neko Atsume, Duck Hunt, Angry Birds, and **Simon** — a Hasbro
trademark, even though the call-and-response mechanic itself is free to use.

This is the practical engineering line, not legal advice.

### Preferred source: the existing pipeline

FurEver has a coherent painterly style and an established imagegen pipeline, with
prompts checked into `docs/art-prompts.json` and `docs/starlight-prompt.txt`, and
the conventions recorded in `docs/ART_ASSETS.md`. Generating new minigame art the
same way keeps one visual identity and raises no third-party licence question.

Mixing in a flat or pixel-art asset pack would read as two different games, so the
aesthetic argument and the licensing argument point the same way.

### If external assets are ever needed

Use **CC0 only** — public domain, commercial use, no attribution:

- Kenney, 60,000+ CC0 assets, consistent style: https://opengameart.org/content/all-cc0-uploader-kenney
- OpenGameArt CC0 filter, includes cat, dog and bird sprites: https://opengameart.org/content/cc0-resources
- Good CC0-Art, a curated higher-quality subset: https://opengameart.org/content/good-cc0-art

Two traps:

1. **"Free" is not CC0.** OpenGameArt also hosts CC-BY and GPL work, and itch.io
   "free" downloads often carry restrictive terms. Check the licence on each
   individual asset, never on the site as a whole.
2. **Record what was used.** If any third-party asset ships, note the source URL
   and licence in `docs/ART_ASSETS.md` at the time it is added, not later.

### The cheapest path

Candidates 1, 2, 3 and 5 need no new art at all — canvas drawing in the existing
palette, icons already shipped, or a bare grid. Three or four minigames can be
added without licensing or commissioning a single image.

## Sources

- Suika Game — https://en.wikipedia.org/wiki/Suika_Game
- Flappy Bird — https://en.wikipedia.org/wiki/Flappy_Bird
- Neko Atsume — https://en.wikipedia.org/wiki/Neko_Atsume
- Neko Atsume design breakdown — https://alexiamandeville.medium.com/game-design-breakdown-the-simplicity-of-neko-atsume-a8616a937a47
- Neopets — https://en.wikipedia.org/wiki/Neopets
- Webkinz — https://en.wikipedia.org/wiki/Webkinz
- Poki cat games — https://poki.com/en/cats
- CrazyGames cat tag — https://www.crazygames.com/t/cat
