# Architecture

The browser sends intent, such as `buy(itemId, quantity)` or `battle_action(move)`. It never sends a trusted balance, price, level, battle result, generation count, or loot roll.

```text
React game UI / local pet + audio runtime
                 │ same-origin JSON + CSRF + idempotency key
                 ▼
App Router API → session + immutable Discord identity → per-user rate limit
                 │
                 ▼
Typed game engine → resulting state + ledger deltas
                 │
                 ▼
PostgreSQL commit_game RPC
  lock player → compare revision → check request fingerprint
  save state + operation receipt + ledger + optional admin audit atomically
```

The game state is a versioned JSONB aggregate per player, with relational tables for identities, sessions, economy records, payments, Mora requests, assets, security events, config and notification outbox. This keeps inventory, rewards, combat and progression in one transactional boundary without a distributed lock. Optimistic revision checks retry competing intents against the latest player state. Immutable operation receipts handle network retries and replay. Redis is unnecessary at this scale because the database rate-limit counter is atomic across Workers.

`lib/game` contains pure rules, catalog and integer progression math. `lib/server` contains provider adapters, security and persistence. `components/game` contains feature screens and local rendering. Installed UI primitives retain keyboard and dialog behavior. `app/api/[...path]` is the single same-origin API dispatcher; every privileged route rechecks server authorization.

Stripe and Mora settlement lock the player and source row, verify the stored source, then update the source status, balance and ledger in the same transaction. Unique external IDs and source status prevent double credit even when webhook event IDs differ.

Minigames disclose only the current target. Each hit must contain the session ID, nonce, expected step and correct target, with server timing and expiration checks. These measures bound trivial reward spoofing; they do not claim to defeat automated browser play.

Only device preferences and tutorial dismissal use localStorage. Service-worker caching is restricted to explicit public static assets. Auth, inventory, balances, generated private images and payment data are not service-worker cached.

Every normal pet interaction is local unless it changes a gameplay stat. No routine interaction requests an AI-generated image or video. Original procedural music and animal-like vocalizations use Web Audio after a user gesture, with configurable levels and music ducking.
