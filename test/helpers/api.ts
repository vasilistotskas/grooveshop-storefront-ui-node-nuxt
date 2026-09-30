import { vi } from 'vitest'
import type { Mock } from 'vitest'

/** The call shape of `$api` / `$fetch`: a request and its ofetch options. */
export type ApiFetch = (request: any, options?: any) => Promise<any>

/**
 * What a route answers with: a value (resolved as-is) or a handler
 * called with the request URL (query string included) and options. A
 * handler may return a value, a promise, or throw — a throw becomes a
 * rejection, so
 * `() => { throw Object.assign(new Error('Not Found'), { statusCode: 404 }) }`
 * is how a spec makes a route fail.
 */
export type ApiRouteHandler = (url: string, options: any) => unknown
export type ApiRoutes = Record<string, unknown>

/** One recorded request, as `callsTo` returns it. */
export interface ApiCall {
  url: string
  options: any
}

export type ApiMock = Mock<ApiFetch> & {
  /** Returns the mock itself — `app/plugins/api.ts` calls `$fetch.create()` while the app boots. */
  create: () => ApiMock
  /** Answer requests by URL for the current test. See {@link createApiMock}. */
  routes: (table: ApiRoutes) => ApiMock
  /** The recorded requests whose URL matches `pattern`, with the same matching rules as `routes`. */
  callsTo: (pattern: string) => ApiCall[]
}

const PREFIX = '*'

/** The request's path: the query string and hash are not part of a route. */
function pathOf(request: unknown): string {
  return String(request).split(/[?#]/, 1)[0]!
}

function matches(pattern: string, request: unknown): boolean {
  const path = pathOf(request)
  return pattern.endsWith(PREFIX)
    ? path.startsWith(pattern.slice(0, -PREFIX.length))
    : path === pattern
}

/** The exact route for `request`, else the longest matching prefix route. */
function findRoute(table: ApiRoutes, request: unknown): string | undefined {
  const patterns = Object.keys(table)
  const exact = patterns.find(p => !p.endsWith(PREFIX) && matches(p, request))
  if (exact !== undefined) return exact
  return patterns
    .filter(p => p.endsWith(PREFIX) && matches(p, request))
    .sort((a, b) => b.length - a.length)[0]
}

function answer(value: unknown, url: string, options: unknown): Promise<unknown> {
  if (typeof value !== 'function') return Promise.resolve(value)
  try {
    return Promise.resolve((value as ApiRouteHandler)(url, options))
  }
  catch (error) {
    return Promise.reject(error)
  }
}

/**
 * A mock for the app's fetchers — `$api`, and Nuxt's `$fetch` that
 * `useApi` / `useLazyApi` / `useRequestFetch` transport through — so one
 * function sees every request a spec makes.
 *
 * `mockNuxtImport` is a macro transformed into a hoisted `vi.mock`, so it
 * must stay at module scope in each spec (Nuxt testing docs); only the
 * mock itself comes from here, through an async `vi.hoisted` (vitest
 * docs, "vi.hoisted"):
 *
 * ```ts
 * const api = await vi.hoisted(async () =>
 *   (await import('~~/test/helpers/api')).createApiMock())
 * mockNuxtImport('$api', () => api)
 * mockNuxtImport('$fetch', () => api)
 * mockNuxtImport('useRequestApi', () => () => api) // only if the code under test uses it
 * ```
 *
 * The default implementation resolves `{}` for every request. The mock is
 * live during Nuxt's bootstrap (`/api/_auth/session`,
 * `/api/_allauth/app/v1/config`, `/api/cart`); a bare `vi.fn()` would
 * return `undefined` there, crash the plugin chain, and surface much
 * later as vue-i18n's "Need to install with `app.use`". Because it is
 * the `vi.fn(impl)` implementation, the project's `mockReset` restores
 * it before every test.
 *
 * `routes(table)` answers by URL for the CURRENT test only — it sets the
 * mock implementation, which `mockReset` undoes — so call it in
 * `beforeEach` or in the test:
 *
 * ```ts
 * api.routes({
 *   '/api/cart/coupons': () => coupons,              // exact path
 *   '/api/promotions/product/*': offers,             // prefix
 *   '/api/b2b/prices': () => { throw notFound },     // rejection
 *   '/api/regions': (_url, opts) => regionsFor(opts.query.country),
 * })
 * expect(api.callsTo('/api/cart/coupon')).toEqual([
 *   { url: '/api/cart/coupon', options: expect.objectContaining({ method: 'POST', body: { code: 'SAVE5' } }) },
 * ])
 * ```
 *
 * A pattern is an exact path, or a prefix when it ends in `*`. The query
 * string and hash of a request are ignored (`useApi` passes the query in
 * options anyway). An exact route beats a prefix; among prefixes the
 * longest wins; an unmatched request resolves `{}`. Exact-by-default is
 * deliberate: `/api/cart/coupons` contains `/api/cart/coupon`, and the
 * `String(url).includes(...)` switches this replaces answered the wrong
 * one.
 *
 * Mocking `$fetch` shadows every `registerEndpoint` in the file — pick one
 * mechanism per spec.
 */
export function createApiMock(): ApiMock {
  const fn = vi.fn<ApiFetch>(() => Promise.resolve({}))
  const mock = fn as ApiMock

  mock.create = () => mock

  mock.routes = (table) => {
    fn.mockImplementation((request, options) => {
      const route = findRoute(table, request)
      if (route === undefined) return Promise.resolve({})
      return answer(table[route], String(request), options) as Promise<any>
    })
    return mock
  }

  mock.callsTo = pattern =>
    fn.mock.calls
      .filter(([request]) => matches(pattern, request))
      .map(([request, options]) => ({ url: String(request), options }))

  return mock
}
