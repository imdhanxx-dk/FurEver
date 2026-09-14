# FurEver approval-only beta

Target: https://furever-beta-sigma.vercel.app

## Included

- The existing illustrated FurEver home and saved companion designs, integrated from the latest GitHub main branch. Desktop play is contained in a centered frame. The polygon town prototype is not the home screen.
- Animated assembled companions in battle; attacks, guarding and health changes show inline. Routine battle notifications and the level-up modal are removed. Level gains float beside the level.
- Kitten Drop: a cat merge puzzle with server-replayed physics, saved rounds, scoring and once-only capped rewards. Grooming remains available.
- Owner-approved Discord beta access. Main menu → Admin → Beta access accepts Discord IDs. Unapproved players see a waiting screen; protected reads and writes are denied. Revocation is checked on every request.
- Welcome gift of 1,000 PC, Meadow ribbon and Moonstone collar. Existing players receive a one-time 500 PC adjustment. Seven separate visit days award gifts ending with the Legendary Aurora aura; a missed day keeps progress.
- Separate companion names and selection, current-game achievements, five-tier wishes with single/ten pulls and skip, atomic spending and reward receipts.
- Voice, paid checkout, Creative Studio and Fusion Lab are closed for beta. No AI image-generation calls are made.
- All three existing custom pet images copied to private Supabase Storage and verified byte-for-byte. No player progress was replaced.

## Validation

58 automated checks pass, including PostgreSQL transaction/retry rules, beta route denial and revocation, welcome rewards, seven-day gifts, puzzle replay, world collision and companion motion. Production builds and live smoke checks are recorded in the release task. General lint still reports existing and new legacy-pattern cleanup work; this is a limited beta, not a claim of a clean lint baseline or finished art.

## Beta test route

1. Open the beta address, sign in with Discord, and check owner access or the pending approval screen.
2. The owner approves a tester's exact Discord user ID in Admin → Beta access. The tester chooses Check access.
3. Name a companion, feed or pet it, switch looks, then reload to confirm the saved name and wallet.
4. In Explore, choose an unlocked location and challenge its guardian. Attack, defend, use a tonic, finish or retreat. Confirm the full companion, inline feedback and saved rewards.
5. Open Minigames, start Kitten Drop, aim and drop matching cats. Complete a qualifying round; confirm one reward and the saved best score.
6. Inspect Daily adventures for welcome and seven-day gifts. Reopening on the same UTC day must not duplicate gifts.
7. Revoke tester approval; the same signed-in session must lose access on its next request.

## Known limits

Battle uses a shared shadow-cat guardian appearance for region enemies. The separate top-down prototype and directional sprite art need further art review; they do not replace the illustrated home. Custom characters use authored front-facing joints rather than full directional animation. Frame rate on physical phones has not been measured.
