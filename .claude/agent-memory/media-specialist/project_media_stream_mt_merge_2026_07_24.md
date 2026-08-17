---
name: media-stream-mt-merge-2026-07-24
description: Media-stream multi-tenant branch merged with main (v2.54.0 -> v2.58.2), commit ddd8137, gate green, not pushed
metadata:
  type: project
---

On 2026-07-24 merged `origin/main` into `multi-tenant` in `grooveshop-media-stream` (commit `ddd8137`, two parents: MT tip `5d6cbc1` + main tip `be49fd5`, package version 2.54.0 -> 2.58.2). This was Task #2 of a 4-repo multi-tenant alignment effort (Django/Nuxt/media-stream/infra), tracked in the plan at `C:\Users\vassi\.claude\plans\at-both-four-repos-reactive-spark.md`.

Key resolutions:
- `Config/config.service.ts`, `config-schema.util.ts`, `input-sanitization.service.ts`, `.env.example` took main's array-typed `validation.allowedDomains` wholesale (already bakes in the four webside.gr hostnames). MT's comma-string plumbing and `warnIfUsingFallbackDomains()` warning were dropped as obsolete/redundant.
- Bull queue subsystem (`Queue/processors/cache-operations.processor.ts`, `Queue/queue.module.ts` + spec) deleted per main (dead code, no live replacement).
- `Cache/operations/cache-image-resource.operation.ts` rebuilt on main's decomposition (`ResourceFetcher` + `ImageFormatProcessor`), re-adding `cacheNamespace(ctx)` and threading `tenantSchema` through `endPhaseAndRecord(phase, layer, result, tenantSchema)`.
- `resource-fetcher.service.ts`: negative-cache key now namespaced `` `image:${request.tenantSchema || 'public'}` `` instead of hardcoded `'image'`.
- `image-format-processor.service.ts`: `buildMetadata(size, format, tenantSchema)` takes tenantSchema as an explicit caller-supplied parameter (not stamped after the call) — every `.rsm` file carries the owning tenant. This directly guards against the H21 cache-warming regression from `MULTI_TENANT_AUDIT.md` recurring.
- Added regression specs: `src/test/Cache/operations/image-format-processor.service.spec.ts` (tenantSchema in `.rsm` metadata) and `resource-fetcher.service.spec.ts` (negative-cache tenant isolation — same resource id, different tenants, don't cross-suppress).

Gate results: type-check clean, lint clean, 72 files / 920 tests passing (coverage 80.64/69.33/82.55/80.86 vs thresholds 78/66/80/78), build clean (188 files via SWC). Not pushed (per plan: production cutover is a separate later phase).

**Why:** this is one leg of a larger effort to bring all 4 `multi-tenant` branches current with `main` before an eventual production cutover; the other legs (Django, Nuxt, infra) were being done in parallel by other agents.
**How to apply:** if asked about media-stream's multi-tenant merge status, this is current as of 2026-07-24 — verify commit `ddd8137` still exists on the branch before citing it, since the branch may have advanced further (infra/cross-repo checkpoints, or an eventual push/cutover) since this was written. See [[feedback-git-merge-heuristic-large-refactor]] for a technique learned while doing this merge.
