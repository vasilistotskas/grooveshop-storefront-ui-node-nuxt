---
name: project_cache_audit_2026-04-13
description: Cross-service cache audit findings from 2026-04-13 covering Redis DB isolation, session eviction, Rosetta prefix collision, TTL misalignment, and missing product cache invalidation signals
type: project
---

Comprehensive cache audit completed 2026-04-13 covering all three services sharing redis-standalone.

**Why:** Owner requested devil's advocate audit to find cross-service issues individual service teams would miss.

**Key findings:**
1. All three services use Redis DB 0 — no isolation
2. Django SESSION_ENGINE=cached_db with allkeys-lru means active sessions can be evicted; session data is in DB as fallback but Knox tokens are cache-only prefixed redis:1:
3. CACHE_CLEAR_PREFIXES = ["redis:1:", "cache:"] — clear_site_cache() hits both Django and Nuxt keys but misses Rosetta ("rosetta:") and translation ("rosetta:translation_version") which use no prefix and therefore survive clear but are also evictable
4. Rosetta keys ("rosetta:po_sync:", "rosetta:mo_sync:", "rosetta:file_paths", "rosetta:translation_version") stored with timeout=None — allkeys-lru WILL evict them; eviction kills translation reload coordination across pods
5. media-stream uses DB=0, key prefix "image:", rate limiting prefix "ratelimit:", Bull queue keys (bull:image-processing:*, bull:cache-operations:*) — all in DB 0 alongside Django/Nuxt
6. media-stream Redis TTL=2592000 (30 days) for image cache — highest TTL pressure on the shared 614MB instance
7. Django TTL=86400 (24h), Nuxt TTL=86400 (24h) — aligned with each other but media-stream's 30-day TTL will dominate LRU eviction victimhood for the other two services
8. No Django signal-based invalidation of Nuxt SSR cache when product/category data changes — maximum staleness = Nuxt staleMaxAge = 24h for categories
9. clear_site_cache() does NOT clear media-stream's image keys or Bull queue keys — media-stream cache grows independently and is never cleared by admin action
10. flushAll() method exists in RedisCacheService (media-stream) and would wipe entire DB 0 including Django sessions and Nuxt cache — this method must never be called in production

**How to apply:** Flag any work touching Redis config, cache clearing logic, Django session storage, or media-stream TTL settings.
