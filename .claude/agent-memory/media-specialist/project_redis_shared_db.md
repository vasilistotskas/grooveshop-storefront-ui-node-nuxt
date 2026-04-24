---
name: All three services share Redis DB 0
description: Django/Celery, Nuxt, and Media Stream all use redis-standalone on DB 0 — key prefix namespacing is the only isolation
type: project
---

All three services connect to `redis-standalone:6379` DB 0 in production:
- **Django/Celery**: `REDIS_HOST=redis-standalone`, CELERY_RESULT_BACKEND uses `/0`
- **Nuxt**: `NUXT_REDIS_HOST=redis-standalone`, `NUXT_REDIS_PORT=6379` (no REDIS_DB set = defaults to 0)
- **Media Stream**: `REDIS_HOST=redis-standalone`, `REDIS_DB=0`

**Why this matters:** Key prefix namespacing is the only isolation:
- Media Stream image cache keys: `image:*`
- Media Stream negative cache: `image:negative:*`
- Media Stream circuit breaker: `circuit_breaker:http_client`
- Media Stream rate limits: `ratelimit:*`

The `RedisCacheService.clear()` method scans `image:*` (not FLUSHDB), so it's safe. But `flushAll()` (used in the clear script) nukes the entire DB — would wipe Django cache, Celery results, and Nuxt cache too.

**How to apply:** Never call `flushAll()` or `FLUSHDB` in production without coordinating all three services. The `clear:cache` script should be treated carefully.
