---
paths:
  - "test/**"
  - "vitest.config.mts"
  - "**/*.spec.ts"
  - "**/*.test.ts"
---

# Testing

Vitest project layout and the Nuxt test-environment traps that cost the most time.

## Test Structure

Tests live in `test/` with three vitest projects configured in `vitest.config.mts`:

| Project | Path | Environment | Purpose |
|---------|------|-------------|---------|
| `unit` | `test/unit/**` | `node` | Pure utils, server utils, logic, composable unit tests |
| `nuxt` | `test/nuxt/**` | `nuxt` | Composables, stores, components, pages needing Nuxt context |
| `e2e` | `test/e2e/**` | `nuxt` | End-to-end flows |

File parallelism is disabled globally to prevent `[nuxt] instance unavailable` errors. The `nuxt` project has retry=2 and testTimeout=15000 for flaky tests. Both `e2e` and `nuxt` projects mock `intersectionObserver` and `indexedDb`, and disable `experimental.appManifest` to prevent timeout errors. Path aliases: `~` and `@` → `./app`, `#shared` → `./shared`.

Coverage uses v8 provider, reports to `./coverage` in text/html/lcov/json formats, covering `app/**` and `server/**`.

## Nuxt Test Environment Gotchas

- **`vi.stubGlobal('$fetch', mock)` does not work at all since Nuxt 4.5** — `$fetch` is a real auto-import in user code (`export { $fetch } from '#build/fetch.mjs'`), so the composable's import binding bypasses globals entirely. Mock it like any other auto-import: `const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))` + `mockNuxtImport('$fetch', () => mockFetch)` at module level. Caveat: this mock is active during Nuxt bootstrap (`/api/_auth/session`, `/api/_allauth/app/v1/config`, `/api/cart`) — if the suite needs `$i18n` or store setup, give the mock a default implementation `vi.fn(() => Promise.resolve({}))` so the plugin chain doesn't crash.
- **Router mocks need full API surface** — `mockNuxtImport('useRouter', ...)` with incomplete mocks (missing `beforeResolve`, `onError`, `isReady`, `resolve`) breaks Nuxt app initialization. Include all Vue Router methods in mock objects.
- **i18n returns real Greek translations in nuxt tests** — `$i18n.t('key')` returns translated text (e.g. `'Αναζήτηση'`), not raw keys. Use `expect.any(String)` for translated text assertions.
- **`test/fixtures/setup/localStorage.ts`** — Required setupFile that provides `Storage` implementation for happy-dom (nuxt-auth-utils needs it).
- **`test/fixtures/plugins/mock-i18n.ts`** — Fallback i18n plugin (rarely activates; `@nuxtjs/i18n` handles it when `$fetch` isn't broken).
- **`registerEndpoint`** from `@nuxt/test-utils/runtime` is the official way to mock Nitro server routes in tests, but doesn't intercept direct `$fetch` calls from composables/stores.
- **evlog `log` not available in unit tests** — `log` is auto-imported by evlog in Nuxt/Nitro context but not in vitest unit environment. Mock with `vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })` in `beforeEach`. In nuxt test environment, evlog's client transport outputs via `console.error` with color formatting (`%c[client]%c error`, style args, structured object).
