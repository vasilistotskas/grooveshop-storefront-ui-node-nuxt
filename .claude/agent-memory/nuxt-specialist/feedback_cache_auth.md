---
name: Cache + auth token mixing
description: Rule against using defineCachedEventHandler when the handler reads per-request auth state
type: feedback
---

NEVER use `defineCachedEventHandler` (or `defineCachedFunction` without a per-user key) when the handler reads `getAllAuthAccessToken`, `getUserSession`, cart session, or any per-request identity. The first request's response gets baked into a shared cache entry and served to all subsequent users — cache poisoning.

**Why:** Found in `loyalty/tiers.get.ts` which called `getAllAuthAccessToken(event)` inside a `defineCachedEventHandler`. The auth token was used to forward the caller's credentials to Django but the response (identical for all users) was cached under a shared key, meaning the first authenticated user's request result was subsequently served to unauthenticated users (bypassing Django's IsAuthenticated check).

**How to apply:**
- If data is identical for all users but requires auth to fetch: use `defineEventHandler` + `defineCachedFunction` split (see `loyalty/summary.get.ts` pattern)
- If data is user-specific: use `defineEventHandler` only — never cache
- If data is fully public (no auth needed): safe to use `defineCachedEventHandler` without any token forwarding
- Existing correct example: `server/api/loyalty/summary.get.ts` — `defineEventHandler` wrapper that calls a `defineCachedFunction` only for the unauthenticated path
