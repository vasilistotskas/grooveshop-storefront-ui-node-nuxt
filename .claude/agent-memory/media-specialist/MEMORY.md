# Media Specialist Memory

- [Cache warming cron hardcoded bug (fixed)](feedback_cache_warming_cron_fixed.md) — `@Cron(EVERY_6_HOURS)` was hardcoded, now uses `SchedulerRegistry` to respect `CACHE_WARMING_CRON` env var
- [Redis shared DB 0 with Django and Nuxt](project_redis_shared_db.md) — all three services use `redis-standalone` DB 0; key prefix isolation is the only separation
- [Cache architecture deep-dive findings](project_cache_architecture.md) — multi-layer cache, TTL units, negative cache, config gaps documented
