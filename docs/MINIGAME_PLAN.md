# Minigame plan: replayed skill games

Design for replacing the two clicker minigames with real skill games, and for the
shared harness they run on. Nothing here is implemented.

Companion research and licensing notes: `docs/MINIGAME_RESEARCH.md`.

## The problem

`Cloud-soft grooming` and `Starlight catch` share one handler pair,
`minigame_start` / `minigame_hit` in `lib/game/engine.ts`. The server generates
`targets: Array.from({ length: 10 }, () => rand(0, 8))` and `publicState` masks
every target but the current step, so the only question the server can ask is
*"did you click the one correct square?"*

That is a lookup, not a game. The failure is structural: all of the skill would
have to live outside the verified channel, so there is no room for skill at all.
No amount of art or animation fixes it.

## The shift: check becomes replay

`Kitten Drop` already solves this. `dropKitten` in `lib/game/kitten-drop.ts` runs
fixed-step deterministic physics on the server; the browser replays the identical
simulation for animation, and the server alone scores and grants currency. The
client sends an aim value, not a result.

Once the server *replays* instead of *checks*, the skill can be anything that can
be simulated. Both games below are built on that.

### Incremental versus chunked

Kitten Drop calls the server once per input, because drops are discrete and
rate-limited to one per 650 ms. Continuous-pointer games cannot do that: 30 Hz for
30 s is roughly 900 inputs.

Use **chunked submission**. The client buffers pointer samples and posts roughly
every 5 s. The server replays each chunk against its own authoritative simulation
state and keeps that state between chunks. This bounds how much a client can
fabricate in one call, keeps the server canonical throughout, and degrades
gracefully if the tab closes mid-round.

### Honest limits

A replayed skill game is not cheat-proof the way a hidden-target game is. Anyone
willing to reimplement the simulation can synthesise a winning input timeline.
Accept that and bound the payoff:

- Keep the existing per-kind daily cap (`minigameLimit`, default 5).
- Keep rewards flat-ish. A steep score-to-payout curve is what makes faking worth
  the effort.
- Apply plausibility bounds on every chunk: maximum pointer velocity, minimum and
  maximum sample cadence, monotonic timestamps, total duration inside a window,
  sample count proportional to elapsed wall-clock time.
- Reject a chunk whose timestamps do not line up with the server's clock for that
  round, within a tolerance.

The trade is deliberate: the current design is cheat-resistant and boring.

## Shared harness

Neither game fits the one-step-at-a-time shape of `minigame_hit`. Build one
harness and put both games on it, and future ones after them.

Actions, alongside the existing ones in the `ACTIONS` set in
`lib/server/router.ts`:

- `skill_start` — issues `{ id, nonce, seed, kind, started, expires }`, subject to
  the existing cooldown and daily-limit checks. The seed determines all procedural
  placement so both sides generate the same world.
- `skill_chunk` — accepts `{ id, nonce, index, samples }`. Validates ordering and
  plausibility, replays the chunk into the stored simulation state, returns the
  authoritative state so the client can reconcile.
- `skill_finish` — settles the round, applies rewards through the existing
  `grant`, `task`, `cooldown` and `s.daily[kind]` plumbing.

Simulation modules live in `lib/game/` beside `kitten-drop.ts` so client and
server import the same code. That is the property that makes replay work; a
separate client implementation would drift.

`publicState` in `lib/server/game-service.ts` must mask any part of the round the
client is not meant to know yet, the way it already masks `challenge.targets`.

## Game 1: Starlight Chase

Replaces `Starlight catch`. Recommended first: the art cost is near zero, the
shape is closest to `dropKitten`, and the `'play'` kind already exists in the
engine with `playCoins` wired.

**Premise.** You do not catch anything. You move the toy, and the cat is the game.

The player drags a glowing star on a wand. The companion runs deterministic AI
with two values, **interest** and **frustration**.

- Interest rises when the toy moves unpredictably near her: direction changes,
  speed variety, proximity. It falls when the toy is still, too far away, or
  moving monotonously. That last clause is the anti-mash rule — circling at a
  constant speed stops working within seconds.
- With interest high and the toy paused briefly inside pounce range, she crouches,
  wiggles, then pounces.
- The pounce connects if the toy is still inside range on the landing frame.

The skill is bait-and-decide: let her have it, or twitch away at the last instant.
Letting her win constantly is boring and scores low; never letting her win raises
frustration until she walks off. The optimum is a rhythm.

**Scoring.** Successful pounces with a combo multiplier, and a frustration fail
state that ends the round early.

**Verification.** Chunked samples of toy position. The AI is deterministic given
seed plus the toy timeline, so the server replays and counts pounces itself.

**Art.** Near zero. Procedural radial-gradient glow and particles for the star,
the existing atlas for the cat, optionally a wand line. Reuse the `play` reaction
and `sampleCompanionPose`.

## Game 2: Tangle & Shine

Replaces `Cloud-soft grooming`. Build second, on the proven harness.

**Premise.** Directional brushing where the companion responds to how you do it.

Seeded knots are placed on real body zones. `companionHit` in
`lib/client/companion-motion.ts` already maps normalised coordinates to `tail`,
`ear`, `head`, `chin`, `paw`, `belly` and `private`, so zones exist today.

Each knot carries a type and a **grain direction**: fur flows outward along the
tail, downward along the back. A knot loosens only when a stroke crosses it within
an angular tolerance of the grain and inside a speed band.

- Too fast: she flinches, and knot progress partly resets.
- Against the grain: she flinches, no progress.
- Correct: sparkles, and the knot clears over roughly three passes.

Burrs are tapped out with a comb rather than stroked, so switching tools is a real
decision. She reacts per zone throughout — purring where she likes it, ear-twitch
on the ear. The existing private-zone recoil is unchanged; see `docs/SECURITY.md`.

**Scoring.** Two axes. Coins scale with completion, bond scales with gentleness,
measured as how few flinches the player caused. Rewarding gentleness suits a game
about care and is something no clicker can express.

**Verification.** Chunked stroke polylines with a tool id. The server replays knot
placement from the seed and applies the same accrual rules.

**Art.** Higher than Starlight Chase. Knot and burr marks, procedural tufts or
small sprites; per-zone grain vectors; brush and comb cursors. Sparkles already
exist as `.reaction-sparkles`.

## Open decisions

1. **Input fidelity.** Roughly 30 Hz is enough for both games. Cap samples per
   chunk and downsample server-side before replay. Pick a cap and state it in the
   simulation module.
2. **Reward shape.** Flat on completion, or scaled by score. Flat with a small
   bonus is the safer default given the daily cap; confirm before building the
   reward path.
3. **Migration.** Whether the old `minigame_*` handlers are removed once both
   games ship, or kept until saved rounds drain. Players may hold a live
   `s.challenge` across the deploy, so the handlers should stay until those
   expire.

## Build order

1. Harness: `skill_start` / `skill_chunk` / `skill_finish`, plausibility bounds,
   `publicState` masking, daily-limit and reward wiring.
2. Starlight Chase simulation in `lib/game/`, with tests.
3. Starlight Chase canvas component, replaying the same simulation.
4. Tangle & Shine simulation and component on the same harness.
5. Remove the old handlers once live rounds have expired.

## Testing

Follow `tests/kitten-drop.test.ts`. The property that matters most is that client
and server replay produce identical state from the same seed and timeline. Also
cover: rejection of implausible chunks, out-of-order and replayed chunk indices,
expiry, and that the daily cap still holds across a chunked round.
