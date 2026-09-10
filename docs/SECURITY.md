# Security boundaries

- `SUPABASE_SERVICE_ROLE_KEY`, OAuth client secret, webhook URLs, signing keys and AI keys remain server-only.
- Discord identity uses immutable `discord_id`, never username or a browser admin flag.
- Sessions use 256-bit random tokens, SHA-256 storage, HttpOnly cookies, SameSite=Lax, seven-day expiry, revocation, and Secure cookies on HTTPS. A session rotation endpoint preserves the original expiry.
- Write requests require an exact configured Origin, matching session CSRF token, bounded body, valid intent and rate-limit allowance.
- PostgreSQL RLS denies direct client access. Server RPC execution is limited to trusted server roles. Parameterized queries/PostgREST filters do not interpolate raw SQL.
- Main game mutations and ledger records commit atomically with version and idempotency checks. Audit and economy tables reject updates and deletes.
- The HTTP API never exposes internal `generation_reserve`, `generation_finish`, `external_credit` or arbitrary admin-grant intents through the normal game endpoint.
- Stripe verification uses raw-body HMAC-SHA256 and a five-minute timestamp window. The database verifies package amount/currency and credits each checkout only once.
- Paid currency cannot purchase wish tickets. The public configuration validator enforces that separation and requires published gacha probabilities to total 100.
- Private-zone interactions immediately recoil, reduce bond/happiness, and pause interaction. They grant no EXP, PC, items or achievements at any bond level. Character gestures are captured on the canvas; room touches are ignored.
- PNG upload limits are checked before parsing. No arbitrary image URLs or user-controlled provider endpoint is fetched. Raw uploads are not served back to browsers.
- React escapes all player text. Discord mentions are disabled. API errors are sanitized; no stack trace or upstream secret is returned.

## Known operational limits

The generic game API validates authority and values but does not attempt advanced bot detection. Security events support review; they do not automatically permanently ban a user. Add WAF/IP limits before a high-traffic public release. Database backups, log retention, monitoring, provider charge reconciliation, content moderation review, legal terms and support staffing are deployment responsibilities.

The Content Security Policy permits inline scripts for the current React hydration path. A nonce-based CSP is a future hardening step; no untrusted raw HTML is injected today. Use HTTPS and configure HSTS at the host.

PostgreSQL service credentials are powerful. Use a dedicated project and least-privilege infrastructure access, and review migrations before applying them. Secrets accidentally committed to a public repository must be revoked, not merely removed in a later commit.
