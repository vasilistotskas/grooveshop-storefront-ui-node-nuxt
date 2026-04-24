---
name: Media Stream cache architecture deep-dive
description: Key facts about TTL units, negative cache, config gaps, and layer behavior from the 2026-04-13 audit
type: project
---

## TTL Units Convention
- `cache.image.publicTtl` / `privateTtl` in `CacheImageResourceOperation`: loaded in **seconds** from env (`CACHE_IMAGE_PUBLIC_TTL` / `CACHE_IMAGE_PRIVATE_TTL`), defaults 12×30×24×3600 / 6×30×24×3600
- Stored in `ResourceMetaData.publicTTL` / `privateTTL` as **milliseconds** (`this.privateTtl * 1000`)
- Passed to `cacheManager.set(...)` as **seconds** (no `* 1000`)
- The `dateCreated + privateTTL > Date.now()` validity check in `checkResourceExists` and `getCachedResource` is correct (both sides in ms)
- The negative cache `Date.now() - timestamp < negativeCacheTtl * 1000` check is correct; the `cacheManager.set` TTL of `negativeCacheTtl` (300) is in seconds — correct

## Cache Key Structure
- `generateKey(namespace, identifier)` → `namespace:identifier`
- Normal image: `image:<resourceId>` (resourceId is a hash)
- Negative cache: `image:negative:<resourceId>` — uses `negativeCacheKey = \`negative:${ctx.id}\``
- Both start with `image:` so `RedisCacheService.clear()` (SCAN `image:*`) clears both correctly

## Memory Cache Sizing (Production)
- `CACHE_MEMORY_MAX_SIZE=536870912` (512 MB) via K8s ConfigMap
- `CACHE_MEMORY_MAX_KEYS=5000`
- `MemoryCacheService` enforces both `maxByteSize` (custom eviction) and `maxKeys` (node-cache)
- Eviction strategy: TTL-ascending (soonest-to-expire evicted first on memory pressure)

## Validation DTO Mismatch
- `MemoryCacheConfigDto` has field `ttl` but actual config key is `defaultTtl`
- The DTO is only used for validation via `config.service.ts::validate()`, not for runtime config
- The mismatch means validation skips the TTL constraint check (no min/max enforcement)
- Not a runtime bug but the DTO should be fixed to use `defaultTtl`

## Cache Warming
- `CACHE_WARMING_CRON: "0 */1 * * *"` (every hour) in production ConfigMap
- Was hardcoded `@Cron(EVERY_6_HOURS)` — **fixed 2026-04-13** to use `SchedulerRegistry`
- Threshold: `CACHE_WARMING_THRESHOLD: "1"` (any file accessed 1+ times gets warmed)
- Max files: `CACHE_WARMING_MAX_FILES: "500"`
- Warmup stores `{ data: Buffer, metadata: ResourceMetaData }` shape — matches what consumers expect

## Redis Startup Resilience
- `lazyConnect: true` + explicit `this.redis.connect()` in `onModuleInit`
- On connect failure: `scheduleReconnect(1)` with exponential backoff (1s, 2s, 4s ... capped at 30s)
- All Redis operations check `if (!this.isConnected)` and degrade gracefully (return null/skip)

## Circuit Breaker
- State persisted to Redis key `circuit_breaker:http_client` with 5-minute TTL
- Persistence interval: 10 seconds
- State restored on startup only if age < 2× resetTimeout
- When open: requests rejected with "Circuit breaker is open", falls back to `serveFallbackImage`
- `flushAll()` would wipe circuit breaker state (another reason not to call it)

## File Storage Cleanup
- Schedule: `0 2 * * *` (daily 2 AM) — config key `storage.cleanup.cronSchedule`
- Policies: old-cache-files (>30d), large-images (>7d >100MB), temp-files (>1d), preserve-recent (keep 100)
- `getNextCleanupTime()` hardcodes "+1 day at 2 AM" independent of cron config — just informational display

## Response Headers (Cache-Control)
- `max-age=${publicTTL / 1000}, public, immutable` — publicTTL in ms / 1000 = seconds
- `Vary: Accept, Accept-Encoding` — correct for WebP/AVIF content negotiation
- 304 response includes ETag, Cache-Control, Vary
- ETag: weak, format `W/"size-dateCreated-format"`
