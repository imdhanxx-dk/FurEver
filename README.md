# FurEver

**The Pet Simulator** — a cozy virtual companion RPG, with Discord identity and server-authoritative progression.

![FurEver sanctuary](public/assets/sanctuary.webp)

## What is implemented

- Discord authorization-code login, one-time OAuth state, revocable server sessions, CSRF and immutable Discord-ID admin authorization.
- Pet creation and personalities; local touch/swipe reactions, care, rest, training, bond, inventory and cosmetics.
- Level 1–100 progression, 620-EXP elixirs, integer-safe 1.2-level growth nectar, daily quests, login streaks and achievements.
- Ten unlockable regions, timed expeditions, server-generated loot and turn-based PvE with defense, criticals, dodge, abilities and bond attacks.
- Interactive grooming and catch minigames, sequenced server challenges, time checks and five rewarded completions per game per UTC day.
- A ticket-only gacha with published odds, 10/50/100 pity guarantees, history and duplicate compensation.
- Configurable monthly events, Pet Coin shop, festival rewards, Mora requests and an audited administration interface.
- OpenAI Images integration with server-enforced attempt limits, PNG validation, private image storage and candidate selection.
- Stripe Checkout integration with signature-verified, idempotent fulfillment. Packages default to **disabled**.
- Responsive interface, keyboard controls, reduced-motion support, procedural music/SFX, PWA shell and an offline page.
- PostgreSQL migrations, transactional economy ledger, optimistic concurrency, rate limits, audit records and automated tests.

## Run locally

Requires Node.js 24 and pnpm 11.19.0.

```sh
pnpm install
cp .env.example .dev.vars
# Fill in the settings described in docs/SETUP.md.
pnpm dev
```

Open `http://localhost:3000`. Without Discord and Supabase configuration, the opening screen loads and gameplay sign-in remains unavailable. There is no guest login or client-authoritative demo account.

```sh
pnpm typecheck
pnpm test
pnpm build
```

The test suite runs a real PostgreSQL engine through PGlite and uses isolated test identities; it never contacts Discord, Stripe, or an AI provider.

## Deployment

- **Sites / Cloudflare Workers:** `pnpm build` emits the Worker and static assets. The `FILES` binding holds private generated images. PostgreSQL is accessed through Supabase's HTTPS Data API.
- **Vercel / Next.js:** import this repository, select the Next.js framework and use the supplied `vercel.json`. `pnpm build:vercel` builds the Next.js adapter; use a **private** Supabase Storage bucket for images. Set runtime variables in Vercel, never in the repository.

Apply the SQL migrations in order before enabling sign-in. See [setup](docs/SETUP.md), [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), and [release status](docs/RELEASE_STATUS.md).

## Release status

This is an initial playable implementation, **not a certified public-production launch**. Live provider end-to-end tests need the owner's Discord OAuth app, Supabase project, AI account, and Stripe test configuration. The supplied Discord notification webhook is stored outside source control.

The current companion runtime animates image assets with local transforms, pointer tracking, distinct reactions, and procedural vocalizations. It does **not** yet include a commissioned Rive/Live2D/Blender rig, independently deforming facial features, or studio-recorded species sound packs. New species currently share the starter display asset until a generated appearance is selected. See the release-status document for the remaining art and operational work; these limitations are not presented as completed systems.

Pet Coins cannot be withdrawn or redeemed for cash. Wish tickets cannot be bought with paid currency.
