---
name: Product attribute cache key fix
description: attributes endpoints were missing getKey, all languageCode variations collapsed to one cache entry; fixed 2026-04-13
type: project
---

`server/api/products/attributes/index.get.ts` and `server/api/products/attributes/values/index.get.ts` both accepted a `languageCode` query param but had NO `getKey` function in their `defineCachedEventHandler` options.

**Why this was a bug:** Without `getKey`, Nitro generates the cache key from the route path only. All requests to `/api/products/attributes` regardless of `?languageCode=el` vs `?languageCode=en` shared one cache entry. The first language to request would win for all subsequent requests.

**Fix applied 2026-04-13:**
- `attributes/index.get.ts`: added `getKey: (event) => 'product-attributes:' + (getQuery(event).languageCode || 'el')`
- `attributes/values/index.get.ts`: added `getKey: (event) => 'product-attribute-values:' + (getQuery(event).languageCode || 'el')`

**How to apply:** Any `defineCachedEventHandler` that varies its backend query by a query parameter MUST include that parameter in `getKey`. Review all existing cached handlers when new query params are added.
