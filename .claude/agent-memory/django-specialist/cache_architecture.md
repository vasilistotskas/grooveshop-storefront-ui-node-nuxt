---
name: Cache Architecture Audit
description: Complete audit of all cache usage in grooveshop-django-api — backends, key patterns, @cache_methods viewsets, known bugs fixed
type: project
---

Audited 2026-04-13. All findings below.

## 1. Cache Configuration (settings.py:421-434)

- Backend: `django.core.cache.backends.redis.RedisCache` (Redis DB 0)
- KEY_PREFIX: `DEFAULT_CACHE_KEY_PREFIX` env var, default `"default"`
- VERSION: `DEFAULT_CACHE_VERSION` env var, default `1`
- TTL: `DEFAULT_CACHE_TTL` env var, default `7200` (2 hours)
- CI env overrides to `KEY_PREFIX="redis"`
- `CACHE_CLEAR_PREFIXES = ["default:1:", "cache:"]` — covers Django cache + Nuxt SSR cache
- All `cache.set()/get()` calls store keys as `{PREFIX}:{VERSION}:{key}` — covered by clear prefix

## 2. @cache_methods Decorator (core/utils/views.py:48-74)

Uses Django's `cache_page` internally. Cache key includes: URL path + query string + Accept + Accept-Language headers. Does NOT include user identity — only safe for public data endpoints.

Cache skipped automatically when: `"test" in sys.argv`, `"pytest" in sys.argv[0]`, or `settings.DISABLE_CACHE=True`.

### Viewsets using @cache_methods (all public-data only — confirmed safe):
- `CountryViewSet` — list, retrieve
- `RegionViewSet` — list, retrieve, get_regions_by_country_alpha_2
- `PayWayViewSet` — list, retrieve
- `TagViewSet` — list, retrieve
- `TaggedItemViewSet` — list, retrieve
- `BlogPostViewSet` — list, retrieve
- `BlogAuthorViewSet` — list, retrieve, posts
- `BlogCategoryViewSet` — list, retrieve, posts, tree, ancestors, descendants
- `ProductCategoryViewSet` — list, retrieve, all
- `ProductImageViewSet` — list, retrieve
- `ProductCategoryImageViewSet` — list, retrieve
- `AttributeViewSet` — list, retrieve
- `AttributeValueViewSet` — list, retrieve

### BUG FIXED: BlogCommentViewSet had @cache_methods on list/retrieve
`get_queryset()` filters by `request.user.is_staff` — staff sees unapproved comments, non-staff only approved. Cache would serve staff's unapproved-comments response to non-staff users. Fix: removed `@cache_methods` decorator from `BlogCommentViewSet` (`blog/views/comment.py`).

**Why:** Security/data leak — unapproved comments would be visible to all users via the cached staff response.

**How to apply:** Never add @cache_methods to any viewset whose get_queryset() or get_permissions() varies by user identity/role.

## 3. Manual cache.set/get Usage

All these go through the Django cache framework (KEY_PREFIX:VERSION: prefix applied):

- `core/tasks.py:105,153` — `cache.add/delete` for distributed lock on `clear_duplicate_history` task (TTL 5min, key `clear_duplicate_history_lock`)
- `core/tasks.py:554-555` — `cache.set/get("health_check", "ok", 30)` for health monitor task
- `core/signals/rosetta.py:85,93,99,101,107` — `.po`/`.mo` file contents for cross-pod K8s sync (TTL 24h, keys `rosetta:po_sync:*`, `rosetta:mo_sync:*`, `rosetta:file_paths`, `rosetta:translation_version`)
- `core/middleware/translation_reload.py:34,41,49,69` — reads the same rosetta keys per-request
- `core/middleware/allauth_ratelimit.py:80-81` — sliding window counters `allauth_rl:*:min:*` and `allauth_rl:*:hr:*` (TTL 60s/3600s)
- `core/management/commands/clear_translation_cache.py:28` — bumps `rosetta:translation_version`
- `order/payment.py:508-532` — caches Viva Wallet OAuth token (`viva_wallet_access_token`, TTL = token expiry - 60s)

## 4. Template Fragment Caching
None. No `{% cache %}` tags found anywhere.

## 5. Parler Translation Caching
- `PARLER_ENABLE_CACHING = True`
- Cache key format: `parler.{app_label}.{ModelClass}.{pk}.{lang_code}` (no PARLER_CACHE_PREFIX set)
- Stored via Django cache framework: actual Redis key = `default:1:parler.product.ProductTranslation.42.el`
- Covered by `CACHE_CLEAR_PREFIXES = ["default:1:"]` — cleared on full site cache clear
- No explicit invalidation signal needed; parler handles it internally on translation save

## 6. Session/Auth Caching
- `SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"` — sessions stored in both Redis cache AND DB
- `SESSION_CACHE_ALIAS = "default"` — uses the same Redis DB
- Session keys have `django.contrib.sessions.cache` prefix from Django internals → stored as `default:1:django.contrib.sessions.cache{session_key}` → covered by clear prefix
- Knox tokens stored in DB only, no cache layer
- Tests use `SESSION_ENGINE = "django.contrib.sessions.backends.db"` (set in conftest.py)

## 7. Cache Invalidation Signals
NO signal handlers invalidate the `@cache_methods` cache on model save/delete. The site cache is:
- Manually cleared via admin: `/admin/clear-cache/` and `/admin/clear-site-cache/`
- Scheduled via Celery: `clear-all-cache` task runs monthly (calls `clear_cache` management command)
- No automatic invalidation when Product, Country, Region, etc. are updated

**Why this matters:** A product category updated in admin will not flush the 2-hour cache — stale data until TTL expires or manual clear. Acceptable given the static nature of this data, but note it.

## 8. Cache Clear Mechanism (admin/admin.py)

Two operations:
1. `clear_cache_for_class(class_name)` — uses `cache_instance.keys(class_name)` to SCAN `*class_name*` then UNLINK matching keys. Targets specific viewset's cache.
2. `clear_site_cache()` — calls `cache_instance.clear_by_prefixes()` which uses `CACHE_CLEAR_PREFIXES` to SCAN+UNLINK by prefix. Safe for shared Redis (no FLUSHDB).

`cache_instance` in `core/caches.py:143` is a standalone `CustomCache(server=REDIS_URL, params={})` — no KEY_PREFIX, no VERSION. This is intentional: it's used ONLY for raw key inspection/deletion (SCAN+UNLINK), never for read/write operations. `clear_by_prefixes()` scans by raw Redis key prefix, not by Django make_key format.

## 9. Extra Settings (django-extra-settings)
`extra_settings` package caches settings in Django's default cache. Keys like `extra_settings_*`. No EXTRA_SETTINGS_CACHE_NAME configured → uses default cache. These keys are covered by `CACHE_CLEAR_PREFIXES = ["default:1:"]`.

## 10. Celery Task Results
`CELERY_RESULT_BACKEND = "django-db"` — results stored in `django_celery_results_taskresult` DB table, NOT in Redis. `CELERY_TASK_RESULT_EXPIRES = 3600` (1 hour). No Redis key accumulation issue.

## 11. cache_instance Connection Issue
`cache_instance` at `core/caches.py:143` creates its own Redis connection pool separate from Django's cache connection pool. This means 2 Redis connection pools in the same process. Minor overhead, acceptable given infrequent admin use.

**How to apply:** When adding new cache usage, ensure it only uses `django.core.cache.cache` (the configured backend), never `cache_instance` (that's only for admin key management).
