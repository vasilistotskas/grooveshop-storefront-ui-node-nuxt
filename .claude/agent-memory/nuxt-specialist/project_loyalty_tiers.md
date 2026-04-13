---
name: Loyalty tiers cache bug fix
description: loyalty/tiers.get.ts was mixing auth state with a shared cache entry; fixed 2026-04-13
type: project
---

`server/api/loyalty/tiers.get.ts` was using `defineCachedEventHandler` while reading `getAllAuthAccessToken(event)` inside the handler body. Cache key was `loyalty:tiers:default` — shared for all users.

**Why this was a bug:** Django's `LoyaltyViewSet.tiers` action requires `IsAuthenticated`. The Nuxt handler conditionally forwarded the caller's Bearer token. The first authenticated user's response (tier list) got cached under the shared key. Subsequent unauthenticated requests would receive that cached response, bypassing Django's auth check.

**Fix applied 2026-04-13:** Converted to `defineEventHandler` (no caching). The `useLoyalty.fetchTiers()` composable already uses `useAsyncData('loyalty-tiers')` for client-side deduplication, so the performance impact of removing server caching is minimal.

**Pending Django fix:** Django's `LoyaltyViewSet.tiers` action should get `@action(permission_classes=[AllowAny])` since tiers are public reference data (tier names, XP thresholds, multipliers) with no user-specific content. Once that lands, `tiers.get.ts` can be converted back to `defineCachedEventHandler` without any auth token forwarding.

**How to apply:** When adding server-side caching to a loyalty/auth-adjacent route, always check whether `getAllAuthAccessToken` or session reads are present. If so, follow the `summary.get.ts` split pattern.
