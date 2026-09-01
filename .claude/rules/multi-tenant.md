---
paths:
  - "server/**"
  - "app/stores/**"
  - "app/composables/**"
  - "nuxt.config.ts"
---

# Multi-tenant architecture

Tenant resolution, the event.context.tenant contract, cache keying and hydration order.

## Multi-Tenant Architecture

## Tenant Resolution Flow

1. `server/middleware/0.tenant.ts` runs first (before all other middleware). It reads `getRequestHost(event)` (no X-Forwarded-Host, to prevent spoofing) and calls `getTenantConfig(host)`.
2. `getTenantConfig` (in `server/utils/tenant.ts`) strips the port, checks a 5-minute in-memory cache, then proxies `GET /api/v1/tenant/resolve?domain=<host>` to Django. The response is validated with `parseDataAs(response, zTenantConfig)`.
3. On success, `event.context.tenant` is set to the validated `TenantConfig` object.
4. On Django 5xx: respond 503 (transient — not cached). On 404: respond 404 "Store not found" (not cached).
5. Certain paths bypass tenant resolution entirely (see `BYPASS_PREFIXES` / `BYPASS_EXACT` in the middleware file): `/_nuxt`, `/_ipx`, `/assets`, `/api/health`, `/health`, `/favicon.ico`, `/favicon.png`, `/logo.svg`, `/robots.txt`, `/manifest.webmanifest`, `/openapi`, `/_health`.

## `event.context.tenant` contract

Every non-bypassed route handler can rely on `event.context.tenant` being a fully-validated `TenantConfig` object (from `shared/openapi/types.gen.ts`). Guaranteed fields include:

- `schemaName` — the Django DB schema identifier (used to namespace media URLs)
- `storeName` — human-readable store name for the PWA manifest
- `primaryDomain` — the tenant's storefront hostname
- `apiDomain` — the tenant's own API hostname (e.g. `api.tenant.com`); used instead of the platform `NUXT_PUBLIC_DJANGO_HOST_NAME` wherever a browser-facing request must hit the tenant's OWN Django schema (WebSocket, social-login redirect, CSP connect-src, `.well-known` OAuth metadata)
- `assetsDomain` — the tenant's own media/image-processing hostname (e.g. `assets.tenant.com`); consumed by `useMediaStreamBaseUrl`/`useMediaStreamImage` (see Image Handling) and additively expands CSP img-src/connect-src alongside the platform `mediaStreamOrigin`
- `staticDomain` — the tenant's own static-file hostname (e.g. `static.tenant.com`); additively expands CSP img-src/connect-src alongside the platform `staticOrigin`
- `defaultLocale` — BCP-47 code consulted by `1.locale.ts` (priority 3 of 4)
- `defaultCurrency` — ISO 4217 code (e.g. `'EUR'`), used in RSS and checkout
- `accentHex` — CSS hex for PWA theme_color
- `faviconUrl` — absolute URL for the tenant favicon (used in PWA manifest icons)
- `loyaltyEnabled`, `blogEnabled` — feature flags
- `metaPixelId`, `tiktokPixelId`, `gaTrackingId` — tenant-only analytics/pixel ids, no platform/env fallback (see Environment)

## `tenantCacheKey` requirement

Every `defineCachedEventHandler` whose data is tenant-specific MUST prefix its cache key with `tenantCacheKey(event, ...)`. Without it, Tenant A's data can be returned to Tenant B from cache (P0 data leak). Usage:

```ts
getKey: (event) => tenantCacheKey(event, `my-route:${param}`)
```

`tenantCacheKey` is defined in `server/utils/cacheKey.ts` and auto-imported.

Routes that are **not** tenant-scoped (e.g. raw public data identical across all tenants) may omit it, but this must be an explicit decision — add a comment explaining why.

## `useBackendFetch` vs raw `$fetch`

- Server utils and middleware use raw `$fetch` with `createHeaders()` for forwarding headers (X-Forwarded-Host, Authorization). This is the standard proxy pattern.
- `useBackendFetch` is a higher-level helper that also injects `X-Forwarded-Host`. Prefer it for new server routes over manually assembling headers.
- Shipping routes (`server/api/shipping/`) use `createHeaders()` because they are public (no auth token forwarding needed).

## `useTenantStore` Pinia hydration sequence

The `tenant` plugin runs with `enforce: 'pre'` and sets `useState('tenant')` from `event.context.tenant` on the server. In the `app:created` hook (after Pinia is installed) it hydrates the store via `useTenantStore().setConfig(tenant.value)`. Never call `useTenantStore()` inside an `enforce: 'pre'` plugin body — Pinia is not yet installed at that point.

Client-side composables can read `useTenantStore()` or `useTenant()` (`useState('tenant')`) interchangeably; the store exposes convenience computed refs (`schemaName`, `defaultCurrency`, `faviconUrl`, etc.).

## Per-tenant runtime config

Both `stripePublishableKey` and `allowedCspSources` are part of `TenantConfig`. `StripePayment.vue` reads `useTenantStore().stripePublishableKey` — tenant-only, no platform-key fallback; `server/middleware/3.csp.ts` extends `script-src`, `img-src`, `connect-src`, `frame-src` with the validated origins from `event.context.tenant?.allowedCspSources`.
