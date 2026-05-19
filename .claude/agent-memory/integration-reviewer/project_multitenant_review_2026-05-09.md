---
name: project_multitenant_review_2026-05-09
description: Cross-service multi-tenant integration review findings from 2026-05-09 — covers tenant config contract, Stripe webhook flow, Knox binding, WS groups, S3 storage, permissions, media-stream, CSP, and infra
type: project
---

Multi-tenant integration review completed 2026-05-09. Key findings:

**A. Tenant config** — `plan` field correctly removed from TenantConfigSerializer. OpenAPI/Zod types match. CRITICAL bug: `app/stores/tenant.ts` line 17 reads `config.value?.plan` but `plan` is not in `TenantConfig` type — TypeScript uses `any` fallback, returns 'trial' always. Django serializer does NOT expose `plan`. Must remove `plan` computed from store.

**B. Stripe webhook** — `tenant_schema` metadata key is consistent between writer (payment.py) and reader (_tenant.py). All 7 djstripe_receiver handlers are decorated with `@with_tenant_schema_from_event`. CORRECT.

**C. Knox tenant binding** — `BoundedTokenAuthentication.authenticate_credentials` validates `UserTenantMembership` for current tenant. Token from tenant-A will 403 on tenant-B. CORRECT.

**D. WS group naming** — All three places (consumers.py, tasks.py, user/signals.py) import from `notification.groups` and call `user_group(schema_name, user_id)`. CORRECT. WS plugin uses ticket-based auth (not Knox token in URL). CORRECT.

**E. S3 storage** — Path consistent: Django writes `media/{schema}/uploads/...`; Nuxt generates `/{schema}/uploads/{src}`; media-stream route `media/:tenantSchema/uploads/:imagePath+` fetches `BACKEND_URL/media/{schema}/uploads/{path}`. CORRECT. `STORAGE_LEGACY_FALLBACK` documented in storages.py.

**F. Permissions** — `IsTenantMemberOrReadOnly` is DRF default. `tenant_resolve` overrides with `AllowAny`. Catalog (read-only) is covered by "ReadOnly" part of the permission. CORRECT.

**G. Media-stream domains** — Default fallback includes `webside.gr,api.webside.gr,assets.webside.gr,static.webside.gr`. No env override in `media-stream-config.yaml` — service runs with fallback and emits WARN at startup. New tenants require `VALIDATION_ALLOWED_DOMAINS` update.

**H. Ingress** — All Middleware resources use `traefik.io/v1alpha1` (no deprecated `traefik.containo.us`). Image tag v1.127.1 consistent across app-grooveshop.yaml (kustomize + prepare-helm). Catch-all is HTTP-only with `redirect-https`. TEMPLATE has `rate-limit-api`. CORRECT.

**I. CSP** — WebSocket `connect-src` uses `getRequestHost(event)` not build-time constant. `allowedCspSources` TODO is still open (Django doesn't expose it yet). KNOWN GAP.

**J. Schema drift** — Not verified by running spectacular; types.gen.ts and zod.gen.ts match TenantConfigSerializer fields exactly (confirmed by inspection).

**Why:** Multi-tenant branch review before production deployment.
**How to apply:** The only blocking issue is the `plan` field in `tenant.ts` store — it will TypeScript-error silently or return `undefined` cast as string. Must fix before deploy.
