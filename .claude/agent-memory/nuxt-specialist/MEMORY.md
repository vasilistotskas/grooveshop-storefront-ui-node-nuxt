# Agent Memory — Nuxt Specialist

- [User profile](user_profile.md) — Senior full-stack developer, prefers clean refactors, no backward compat cruft
- [Cache auth poisoning rule](feedback_cache_auth.md) — NEVER use defineCachedEventHandler when the handler reads auth tokens (getAllAuthAccessToken, etc.)
- [Loyalty tiers bug](project_loyalty_tiers.md) — loyalty/tiers.get.ts was using defineCachedEventHandler + auth token (fixed 2026-04-13); Django needs AllowAny permission on tiers action
- [Attribute cache key fix](project_attribute_cache_keys.md) — attributes/index.get.ts and attributes/values/index.get.ts were missing getKey, all languageCode variations collapsed to one entry (fixed 2026-04-13)
