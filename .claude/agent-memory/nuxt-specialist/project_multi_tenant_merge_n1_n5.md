---
name: multi-tenant-merge-n1-n5
description: Nuxt multi-tenant branch merge (N1/N2/N4/N5) findings — CSP djangoHost, site-config internals, h3 fetch behavior, evlog/seo bump regressions
metadata:
  type: project
---

Merged `origin/main` (v3.143.0) into `multi-tenant` and closed 4 latent gaps (2026-07-25), commits 7ac9f040/a5fc7f21/e54f6717/e39e4f2a on the storefront's `multi-tenant` branch (not pushed; N3/N6/N7 remain, blocked on Django D4/D9). Four facts worth keeping past this session:

1. **CSP's `djangoHost` must stay config-first, not request-first.** `app/plugins/websocket.client.ts` always dials `config.public.djangoHostName` directly (never `window.location.host`) — frontend and API live on different hostnames in prod (webside.gr vs api.webside.gr). A plan draft suggested making `server/middleware/3.csp.ts`'s `djangoHost` request-first to mirror `createHeaders()`'s X-Forwarded-Host convention; that convention solves a *different* problem (telling Django which tenant via the Nuxt→Django hop) and would have broken the CSP's `wss://` allowance for the real production websocket. Keep `(config.public.djangoHostName as string) || requestHost || 'localhost'`, config-first.
2. **`nuxt-site-config`'s `updateSiteConfig`/`getSiteConfig`/`createSiteConfigStack` aren't in the package's public `exports` map** (only `.`, `./kit`, `./utils`, `./urls`). Can't safely deep-import the real implementation in a test (pnpm content-hash dist paths aren't stable, and Node's exports map blocks it anyway). `server/middleware/4.tenant-site-config.ts`'s read-back spec reimplements the stack's push/get priority-resolution semantics locally instead. The module's own `init` server middleware pushes the platform runtimeEnv config at `SiteConfigPriority.runtime` (0); a user middleware that pushes unprioritised also lands at 0 and wins by insertion order (module middleware runs before user `server/middleware/*`).
3. **h3 1.15.11's `event.fetch()` auto-forwards the original request's Host header** for relative-path (`req.startsWith('/')`) targets via `getProxyRequestHeaders(event, {host: true})` — confirmed in `fetchWithEvent`. Nitro pins the same h3 version. So `.md`-mirror tenant leakage wasn't a missing-Host-header bug; it was `0.tenant.ts`'s own `.md`-suffix bypass also swallowing the internal negotiation re-fetch. Fixed by exempting requests carrying `x-md-negotiation-internal` from that bypass.
4. **Dependency-bump regressions from the v3.133→v3.143 jump**, not called out anywhere before this merge: evlog 2.17.0→2.22.3 tightened `log.*` to a strict 2-arg signature (3-arg calls now throw TS2554 — grep `log\.(info|warn|error|debug)\('[^']+',\s*'[^']+',\s*\{` for more); `@nuxtjs/seo` 5.1.3→5.3.6 changed the `Link` type union enough to break inference on object literals spread into `useHead()`'s `link` array (fix: `as const` on the `rel` field).

See [[feedback_use_context7_proactively]] and [[feedback_no_hardcode_domain]] — this work is a direct application of both.
