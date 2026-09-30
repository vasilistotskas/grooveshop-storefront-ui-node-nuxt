/**
 * The Nitro runtime, for source code running in the `unit` project.
 *
 * Every name in `NITRO_SHIM_IMPORTS` (./imports.ts) resolves here when a
 * file under `server/` uses it as an auto-import. Each export mirrors the
 * real implementation's observable behaviour — the source it mirrors is
 * named on it — minus what only a running server has (a build's virtual
 * modules, a Redis connection, a real cache). The deliberate gap is
 * caching itself: the `defineCached*` wrappers run the handler every
 * time and RECORD their options, so a spec asserts the key and the cache
 * settings (`cacheOptionsOf`) rather than Nitro's storage behaviour. The
 * event a cached handler receives is Nitro's, though (see
 * `defineCachedEventHandler`).
 *
 * State lives here, not in the specs, and `resetNitroRuntime()` (run by
 * `test/fixtures/setup/nitro.ts` before every test) puts it back.
 *
 * Specs do not import this file; they use `test/helpers/nitro`, which
 * re-exports what a spec needs from it.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import { defu } from 'defu'
import { createError, createEvent, defineEventHandler, isEvent } from 'h3'
import type { EventHandler, EventHandlerRequest, H3Event } from 'h3'
import { createSiteConfigStack } from 'site-config-stack'
import type { SiteConfigInput, SiteConfigResolved, SiteConfigStack } from 'site-config-stack'
import { createStorage, prefixStorage } from 'unstorage'
import type { Storage } from 'unstorage'
import { vi } from 'vitest'

// ── useRuntimeConfig (nitropack/runtime/internal/config) ──────────────

/** A 32+ character password, as h3 sealed sessions require. */
const TEST_SESSION_PASSWORD = 'unit-test-session-password-0123456789'

/**
 * The runtime config every test starts from: the keys of
 * `runtimeConfig` in `nuxt.config.ts`, with neutral test values.
 */
export function defaultRuntimeConfig() {
  return {
    apiBaseUrl: 'http://backend.test/api/v1',
    djangoUrl: 'http://backend.test',
    mediaStreamPath: '',
    cacheBase: 'memory',
    secretKey: 'unit-test-secret-key',
    session: {
      name: 'nuxt-session',
      password: TEST_SESSION_PASSWORD,
    },
    cachePurgeToken: '',
    contactAttachmentMaxBytes: 25 * 1024 * 1024,
    redis: {
      host: '',
      port: 6379,
      ttl: 3600,
      password: '',
      db: 3,
    },
    public: {
      appTitle: 'GrooveShop',
      baseUrl: 'https://platform.test',
      cartoBasemapsKey: '',
      djangoHostName: 'platform.test',
      djangoUrl: 'https://platform.test',
      googleGsiEnable: false,
      mediaStreamOrigin: 'https://assets.platform.test',
      mediaStreamPath: '/media_stream-image',
      titleSeparator: '|',
      static: { origin: 'https://static.platform.test' },
      version: '0.0.0-test',
    },
  }
}

export type TestRuntimeConfig = ReturnType<typeof defaultRuntimeConfig> & Record<string, any>

let runtimeConfig: TestRuntimeConfig = defaultRuntimeConfig()

/** Deep-merge `partial` over the current config (arrays are replaced). */
export function setRuntimeConfig(partial: Record<string, unknown>): TestRuntimeConfig {
  runtimeConfig = defu(partial, runtimeConfig) as TestRuntimeConfig
  return runtimeConfig
}

export function useRuntimeConfig(_event?: H3Event): TestRuntimeConfig {
  return runtimeConfig
}

// ── useEvent (nitropack/runtime/internal/context) ─────────────────────

/**
 * Nitro binds the current event with `unctx` over AsyncLocalStorage
 * (`experimental.asyncContext: true` in nuxt.config.ts); so does this.
 */
const eventContext = new AsyncLocalStorage<H3Event>()

export function runWithEvent<T>(event: H3Event, fn: () => T): T {
  return eventContext.run(event, fn)
}

export function useEvent(): H3Event {
  const event = eventContext.getStore()
  if (!event) {
    // Same error Nitro throws outside a request.
    throw createError({
      message: 'Nitro request context is not available. Note: This is an experimental feature and might be broken on non-Node.js environments.',
    })
  }
  return event
}

// ── defineCached* (nitropack/runtime/internal/cache) ──────────────────

export interface CacheOptions<E = H3Event> {
  name?: string
  group?: string
  maxAge?: number
  staleMaxAge?: number
  swr?: boolean
  varies?: string[]
  getKey?: (...args: any[]) => string | Promise<string>
  shouldBypassCache?: (event: E) => boolean | Promise<boolean>
  [key: string]: unknown
}

const cacheOptions = new WeakMap<object, CacheOptions>()

/** The options a `defineCachedEventHandler` / `defineCachedFunction` was given. */
export function cacheOptionsOf(cached: object): CacheOptions {
  const options = cacheOptions.get(cached)
  if (!options) throw new Error('Not created by defineCachedEventHandler / defineCachedFunction')
  return options
}

/** nitropack's `cloneWithProxy` (runtime/internal/cache.mjs). */
function cloneWithProxy<T extends object>(target: T, overrides: Record<PropertyKey, unknown>): T {
  return new Proxy(target, {
    get: (obj, property, receiver) => property in overrides ? overrides[property] : Reflect.get(obj, property, receiver),
    set: (obj, property, value, receiver) => {
      if (property in overrides) {
        overrides[property] = value
        return true
      }
      return Reflect.set(obj, property, value, receiver)
    },
  })
}

/**
 * Runs the handler on the event Nitro builds for a cached handler
 * (`nitropack/runtime/internal/cache.mjs`, `defineCachedEventHandler`):
 * a request whose headers are ONLY the `varies` headers, sharing the
 * incoming event's `context`. So a cached handler that reads the Host or
 * any other header off its own event sees `localhost`/nothing here, as it
 * does in production, where the answer would be cached for every
 * tenant. `getKey` gets the incoming event, as Nitro's does, and
 * `useEvent()` stays bound to it.
 */
export function defineCachedEventHandler<Request extends EventHandlerRequest, Response>(
  handler: EventHandler<Request, Response>,
  options: CacheOptions = {},
): EventHandler<Request, Response> {
  const variableHeaderNames = (options.varies ?? []).filter(Boolean).map(name => name.toLowerCase())
  const wrapped = defineEventHandler<Request>((incoming) => {
    const variableHeaders: Record<string, string | string[]> = {}
    for (const name of variableHeaderNames) {
      const value = incoming.node.req.headers[name]
      if (value !== undefined) variableHeaders[name] = value
    }
    const event = createEvent(cloneWithProxy(incoming.node.req, { headers: variableHeaders }), incoming.node.res)
    event.context = incoming.context
    // Nitro's copy reads the body from the shared node request stream.
    // `callRoute` goes through h3's `toPlainHandler`, which parks it on
    // the event's `_requestBody` (h3 1.x `readRawBody` reads it there
    // first), so carry that slot over too.
    event._requestBody = incoming._requestBody
    return handler(event as H3Event<Request>)
  })
  cacheOptions.set(wrapped, options)
  return wrapped as EventHandler<Request, Response>
}

export function defineCachedFunction<T, Args extends unknown[]>(
  fn: (...args: Args) => T | Promise<T>,
  options: CacheOptions = {},
): (...args: Args) => Promise<T> {
  const wrapped = async (...args: Args) => fn(...args)
  cacheOptions.set(wrapped, options)
  return wrapped
}

// ── defineNitroPlugin (nitropack/runtime/internal/plugin) ─────────────

export type NitroTestPlugin = (nitroApp: { hooks: any }) => void | Promise<void>

/** Identity, like Nitro's. Run one with `runNitroPlugin`. */
export function defineNitroPlugin(plugin: NitroTestPlugin): NitroTestPlugin {
  return plugin
}

// ── useStorage (nitropack/runtime/internal/storage) ───────────────────

/** The real unstorage, memory-backed; a fresh one per test. */
let storage: Storage = createStorage()

export function useStorage<T extends object = any>(base = ''): Storage<T> {
  return (base ? prefixStorage(storage, base) : storage) as unknown as Storage<T>
}

// ── evlog: log, useLogger ─────────────────────────────────────────────

type LogMethod = (...args: unknown[]) => void

/** evlog's global `log` (`evlog/dist/logger`), as spies. */
export const log = {
  debug: vi.fn<LogMethod>(),
  info: vi.fn<LogMethod>(),
  warn: vi.fn<LogMethod>(),
  error: vi.fn<LogMethod>(),
}

/** The request-scoped wide-event logger evlog's Nitro plugin puts on `event.context.log`. */
export interface TestRequestLogger {
  /** Every field `set` so far, deep-merged — what the wide event would carry. */
  readonly fields: Record<string, unknown>
  /** The level `setLevel` last chose, if any. */
  readonly level: string | undefined
  set: (fields: Record<string, unknown>) => void
  setLevel: (level: string) => void
}

export function createRequestLogger(): TestRequestLogger {
  let fields: Record<string, unknown> = {}
  let level: string | undefined
  return {
    get fields() {
      return fields
    },
    get level() {
      return level
    },
    set(next) {
      fields = defu(next, fields)
    },
    setLevel(next) {
      level = next
    },
  }
}

/** Same contract as `evlog/dist/runtime/server/useLogger`. */
export function useLogger(event: H3Event, service?: string): TestRequestLogger {
  const logger = event.context.log as TestRequestLogger | undefined
  if (!logger) throw new Error('[evlog] Logger not initialized. Make sure the evlog Nitro plugin is registered.')
  if (service) logger.set({ service })
  return logger
}

// ── nuxt-auth-utils (dist/runtime/server/utils/session) ───────────────

/**
 * The visitor's session. One visitor per test: nuxt-auth-utils keeps it
 * in a sealed cookie, which a unit test has no second request to carry,
 * so the store is simply the session data the next call will read.
 */
let sessionData: Record<string, unknown> = {}

const TEST_SESSION_ID = 'unit-test-session'

export const testSession = {
  get data(): Record<string, any> {
    return sessionData
  },
  set(data: Record<string, unknown>) {
    sessionData = structuredClone(data)
  },
}

export async function getUserSession(_event: H3Event): Promise<Record<string, any>> {
  return { ...structuredClone(sessionData), id: TEST_SESSION_ID }
}

export async function setUserSession(_event: H3Event, data: Record<string, unknown>) {
  sessionData = defu(structuredClone(data), sessionData)
  return sessionData
}

export async function replaceUserSession(_event: H3Event, data: Record<string, unknown>) {
  const { id: _id, ...rest } = data
  sessionData = structuredClone(rest)
  return sessionData
}

export async function clearUserSession(_event: H3Event) {
  sessionData = {}
  return true
}

export async function requireUserSession(event: H3Event, opts: { statusCode?: number, message?: string } = {}) {
  const session = await getUserSession(event)
  if (!session.user) {
    if (isEvent(event)) {
      throw createError({ statusCode: opts.statusCode || 401, message: opts.message || 'Unauthorized' })
    }
    throw new Response(opts.message || 'Unauthorized', { status: opts.statusCode || 401 })
  }
  return session
}

// ── nuxt-site-config (dist/runtime/server/composables/*SiteConfig) ────

function siteConfigStackOf(event: H3Event): SiteConfigStack {
  event.context.siteConfig ||= createSiteConfigStack()
  return event.context.siteConfig as SiteConfigStack
}

export function updateSiteConfig(event: H3Event, input: SiteConfigInput): void {
  siteConfigStackOf(event).push(input)
}

export function getSiteConfig(event: H3Event, options?: Record<string, unknown>): SiteConfigResolved {
  return siteConfigStackOf(event).get(
    defu(options, useRuntimeConfig(event)['nuxt-site-config'], { debug: false }),
  )
}

// ── @nuxtjs/sitemap (dist/runtime/server/composables/*) ───────────────

export const defineSitemapEventHandler = defineEventHandler

export function asSitemapUrl<T>(url: T): T {
  return url
}

// ── The backend: the `fetch` under Nitro's `$fetch` ───────────────────

/**
 * The network, as a spy. Nitro's global `$fetch` is ofetch; the setup
 * file installs a REAL ofetch over this, so query serialisation, header
 * merging, `$fetch.create` interceptors, retries and `FetchError`s all
 * behave as in production and only the HTTP exchange is faked. h3's
 * `proxyRequest` calls the global `fetch`, which is this too.
 *
 * With no reply configured every request fails loudly.
 */
export const backendFetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
  throw new Error(`Unexpected backend request: ${String(input instanceof Request ? input.url : input)}`)
})

// ── Reset ─────────────────────────────────────────────────────────────

export function resetNitroRuntime(): void {
  runtimeConfig = defaultRuntimeConfig()
  storage = createStorage()
  sessionData = {}
}
