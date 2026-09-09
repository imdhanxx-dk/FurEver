# FurEver setup

## 1. PostgreSQL / Supabase

Create a dedicated Supabase project. In its SQL editor, apply `db/migrations/001_initial.sql`, then `002_integrations.sql`, followed by any later numbered migrations. These are PostgreSQL migrations, not Cloudflare D1 migrations. Do not run them on a database shared with unrelated apps without reviewing grants.

Set `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Do not use a publishable key. RLS intentionally denies every browser role. All persistence passes through the authenticated application server.

The catalog and default event live in `lib/game/catalog.ts`; defaults are used until an admin saves the first configuration. User creation atomically initializes the player state. No administrator password or account is seeded.

For Vercel, create a **private** Storage bucket named `furever-assets` and set `ASSET_BUCKET` to its name. The server proxies owned assets; the bucket must not be public. Sites uses the `FILES` R2 binding instead.

## 2. Discord OAuth

Create an application in the [Discord Developer Portal](https://discord.com/developers/applications). Add these redirect URLs for the environments you use:

```text
http://localhost:3000/api/auth/callback
https://YOUR_DEPLOYED_ORIGIN/api/auth/callback
```

Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and the exact `APP_ORIGIN`, without a trailing slash. For the provisioned private Sites environment the origin is `https://furever.almond-yew-9230.chatgpt.site`. A webhook URL cannot replace OAuth credentials.

Set `ADMIN_DISCORD_ID` to the administrator's immutable numeric user ID (Discord Developer Mode → Copy User ID). Only that verified identity gains administrative access. The app requests only the `identify` scope and never stores Discord access tokens.

The server uses Discord's confidential authorization-code flow and validates a random, HttpOnly-bound, expiring, single-use state. It does not assume unsupported PKCE parameters for this confidential web flow. [Discord OAuth documentation](https://docs.discord.com/developers/topics/oauth2).

## 3. Discord notifications

Set `DISCORD_ADMIN_WEBHOOK_URL` as a secret. The owner-supplied webhook has been saved to the private Sites environment, not committed here. Support messages and Mora requests are queued before delivery. Mentions are disabled. The admin Outbox page can retry failed deliveries. Discord delivery is at least once; a network failure after delivery can lead to a duplicate notification. Economy credits remain idempotent independently of notification delivery.

## 4. Creative studio

Set `AI_PROVIDER_API_KEY` in your host's encrypted environment settings. `AI_IMAGE_MODEL` defaults to `gpt-image-1`; choose an image model enabled for your account. Both image generation and editing use fixed official API endpoints. Avatar creation requires a PNG portrait. PNGs must be 64–2048 pixels per side and at most 4 MB; animated PNG/SVG/arbitrary URLs are rejected. Originals are not retained. Generated images are stored privately.

A generation reserves an attempt before contacting the provider. Failures count toward the five-attempt cap to prevent cost abuse; admins have unlimited attempts. A stale pending generation stops blocking another attempt after five minutes. If a provider result succeeds but persistence fails, inspect the job/object before taking further action; never blindly repeat a charged request. [OpenAI Images API](https://developers.openai.com/api/reference/resources/images).

## 5. Stripe test mode, then launch review

Set `STRIPE_SECRET_KEY` to a **test** key and create a webhook for `/api/payments/webhook`; set its signing secret as `STRIPE_WEBHOOK_SECRET`. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Enable packages only after verifying account currency, displayed prices, test payment, failed payment, async payment, and repeated delivery behavior.

Package amounts are integers in the smallest currency unit. Fulfillment checks the stored amount, currency, payment identity and paid status. The return URL never credits coins. Refunds/disputes are **not automated in this release**; reconcile and resolve them with an audited adjustment before enabling live purchases. [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment), [signature verification](https://docs.stripe.com/webhooks/signature).

## 6. Hosts

For Workers preview, copy `.env.example` to `.dev.vars`. For Next.js preview, copy to `.env.local` and run `pnpm dev:vercel`. Real secrets are ignored by Git. On hosted environments, set the same values in the host's secret manager. `APP_ORIGIN` must match the environment; do not reuse a production cookie origin on localhost.

For production, configure backups, retention and alerting. Schedule removal of expired sessions/OAuth states and old rate-limit windows. Keep operation records for the applicable reward/payment retention window; deleting idempotency records too early can reopen replay paths. Use a separate staging database and separate Stripe test keys.
