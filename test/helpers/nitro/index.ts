/**
 * Test harness for the Nitro server layer (`server/**`), `unit` project.
 *
 * The source under test resolves its auto-imports for real (see
 * `vitest.config.mts` and `./imports.ts`): h3, `server/utils/**` and
 * `shared/**` are the production code, and only Nitro's runtime and the
 * module helpers come from `./runtime.ts`. So a spec mocks boundaries
 * only — the backend (`backend`), `vi.mock('~~/server/utils/tenant')`
 * where a spec needs a tenant lookup to answer, time — and everything
 * else a route does (parse, key, headers, error mapping) is exercised.
 *
 * Events are real h3 events. `callRoute` runs a handler behind a real h3
 * app and router, so path params, status codes, headers, error-to-status
 * mapping and the response body are what h3 would produce; `createTestEvent`
 * + `callHandler` suit middleware and utils that read or mutate one event.
 */
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import {
  createApp,
  createEvent,
  createRouter,
  defineEventHandler,
  toPlainHandler,
} from 'h3'
import type { EventHandler, H3Error, H3Event, RouterMethod } from 'h3'
import { createHooks } from 'hookable'
import type { Hookable } from 'hookable'
import {
  backendFetch,
  createRequestLogger,
  runWithEvent,
} from './runtime'
import type { NitroTestPlugin, TestRequestLogger } from './runtime'

export {
  cacheOptionsOf,
  log,
  setRuntimeConfig,
  testSession,
  useRuntimeConfig,
  useStorage,
} from './runtime'

// ── Requests ──────────────────────────────────────────────────────────

export interface TestRequest {
  /** Path and query, e.g. `/api/products/1?page=2`. Default `/`. */
  url?: string
  method?: string
  /** The store the request is for: sets the `Host` header. Default `shop.test`. */
  host?: string
  /** Extra request headers (any case). */
  headers?: Record<string, string>
  /**
   * A plain object or array (sent as JSON), a string or a Buffer. A
   * `FormData` (sent as multipart) is supported by `callRoute` only.
   */
  body?: unknown
  /** Merged into `event.context` — `tenant`, `locale`, `params`, … */
  context?: Record<string, unknown>
  /** The socket peer address h3's `getRequestIP` falls back to. */
  remoteAddress?: string
}

const TEST_HOST = 'shop.test'

function requestHeaders(req: TestRequest): Record<string, string> {
  const headers: Record<string, string> = { host: req.host ?? TEST_HOST }
  for (const [name, value] of Object.entries(req.headers ?? {})) {
    headers[name.toLowerCase()] = value
  }
  if (isJsonBody(req.body) && !headers['content-type']) {
    headers['content-type'] = 'application/json'
  }
  return headers
}

function isJsonBody(body: unknown): boolean {
  return typeof body === 'object' && body !== null && (Array.isArray(body) || body.constructor === Object)
}

function serialiseBody(body: unknown): string | Buffer | undefined {
  if (body === undefined || body instanceof FormData) return undefined
  return isJsonBody(body) ? JSON.stringify(body) : body as string | Buffer
}

/**
 * A real h3 event over node's `IncomingMessage`/`ServerResponse`, with
 * the evlog request logger in place (`event.context.log`), as the evlog
 * Nitro plugin leaves it.
 */
export function createTestEvent(req: TestRequest = {}): H3Event {
  const socket = new Socket()
  if (req.remoteAddress) {
    Object.defineProperty(socket, 'remoteAddress', { value: req.remoteAddress })
  }
  const nodeReq = new IncomingMessage(socket)
  nodeReq.method = (req.method ?? 'GET').toUpperCase()
  nodeReq.url = req.url ?? '/'
  nodeReq.headers = requestHeaders(req)
  const body = serialiseBody(req.body)
  if (body !== undefined) {
    // On the request stream, where h3's `readRawBody` reads a node
    // request that declares a `content-length`.
    const bytes = Buffer.from(body)
    nodeReq.headers['content-length'] = String(bytes.length)
    nodeReq.push(bytes)
    nodeReq.push(null)
  }
  const event = createEvent(nodeReq, new ServerResponse(nodeReq))
  Object.assign(event.context, { log: createRequestLogger() }, req.context)
  return event
}

/** The evlog request logger of `event` (see `createTestEvent`). */
export function loggerOf(event: H3Event): TestRequestLogger {
  return event.context.log as TestRequestLogger
}

/** Run `fn` with `useEvent()` bound to `event`, as inside a Nitro request. */
export function withEvent<T>(event: H3Event, fn: () => T): T {
  return runWithEvent(event, fn)
}

/**
 * Call a handler or middleware directly with `event` (bound for
 * `useEvent()`), resolving to what it returns and rejecting with what it
 * throws. For status, headers and the serialised body, use `callRoute`.
 */
export async function callHandler<T>(handler: EventHandler<any, T>, event: H3Event = createTestEvent()): Promise<Awaited<T>> {
  return await runWithEvent(event, () => handler(event)) as Awaited<T>
}

// ── Routes ────────────────────────────────────────────────────────────

export interface RouteRequest extends TestRequest {
  /**
   * The route pattern the file is mounted at, with h3 params: e.g.
   * `/api/products/:id/reviews` for `server/api/products/[id]/reviews.get.ts`.
   * Default: `url`'s path (a route with no params).
   */
  route?: string
}

export interface RouteResponse {
  status: number
  headers: Headers
  /** The response body: parsed when JSON, the text otherwise, `undefined` when empty. */
  body: any
  /** The error the handler threw, as h3 normalised it — `undefined` on success. */
  error: H3Error | undefined
  /** The request's evlog wide-event logger. */
  logger: TestRequestLogger
  /** The event the handler ran with. */
  event: H3Event
}

/**
 * Serve one request through a real h3 app: router params, `setResponseStatus`,
 * response headers, redirects and error-to-status mapping all behave as
 * under Nitro. `useEvent()` is bound while the handler runs.
 *
 * An error's BODY is h3's `sendError` JSON (`statusCode`, `statusMessage`,
 * `message`, `data`), not Nuxt's production error handler, which strips
 * `data` — assert on it only for what h3 itself would send.
 */
export async function callRoute(handler: EventHandler, req: RouteRequest = {}): Promise<RouteResponse> {
  const url = req.url ?? req.route ?? '/'
  const method = (req.method ?? 'GET').toUpperCase()
  let event: H3Event | undefined
  let error: H3Error | undefined
  const app = createApp({
    onError(caught) {
      error = caught
    },
  })
  const router = createRouter()
  router.add(req.route ?? new URL(url, 'http://x').pathname, defineEventHandler((e) => {
    event = e
    if (req.remoteAddress) {
      Object.defineProperty(e.node.req.socket, 'remoteAddress', { value: req.remoteAddress, configurable: true })
    }
    return runWithEvent(e, () => handler(e))
  }), method.toLowerCase() as RouterMethod)
  app.use(router)
  const headers = requestHeaders(req)
  let body = serialiseBody(req.body) as BodyInit | undefined
  if (req.body instanceof FormData) {
    // Serialise once, so the boundary in the header matches the body.
    const multipart = new Response(req.body)
    headers['content-type'] = multipart.headers.get('content-type')!
    body = Buffer.from(await multipart.arrayBuffer())
  }
  const response = await toPlainHandler(app)({
    method,
    path: url,
    headers,
    body,
    context: { log: createRequestLogger(), ...req.context },
  })
  if (!event) throw new Error(`No route matched ${method} ${url}${req.route ? ` for ${req.route}` : ''}`)
  const responseHeaders = new Headers(response.headers)
  return {
    status: response.status,
    headers: responseHeaders,
    body: parseBody(response.body, responseHeaders),
    error,
    logger: loggerOf(event),
    event,
  }
}

function parseBody(body: unknown, headers: Headers): any {
  if (body === undefined || body === null || body === '') return undefined
  // A streamed response (`sendProxy`, `sendStream`) lands as a Uint8Array.
  const text = body instanceof Uint8Array ? Buffer.from(body).toString('utf8') : String(body)
  return headers.get('content-type')?.includes('json') ? JSON.parse(text) : text
}

// ── Plugins ───────────────────────────────────────────────────────────

export interface TestNitroApp {
  hooks: Hookable<Record<string, (...args: any[]) => any>>
}

/** Run a Nitro plugin against an app with real `hookable` hooks, then fire them with `hooks.callHook`. */
export async function runNitroPlugin(plugin: NitroTestPlugin): Promise<TestNitroApp> {
  const nitroApp: TestNitroApp = { hooks: createHooks() }
  await plugin(nitroApp)
  return nitroApp
}

// ── The backend ───────────────────────────────────────────────────────

/** One request Nitro sent to the backend, as the network saw it. */
export interface BackendRequest {
  url: URL
  /** `url` without its query string. */
  path: string
  method: string
  query: Record<string, string>
  headers: Headers
  /** The body: parsed when JSON, as sent otherwise. */
  body: any
}

type Reply = unknown | Response | ((request: BackendRequest) => unknown | Response | Promise<unknown | Response>)

/** A JSON response; `status` ≥ 400 makes ofetch reject with a `FetchError`. */
export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function toBackendRequest(input: RequestInfo | URL, init: RequestInit = {}): BackendRequest {
  const url = new URL(input instanceof Request ? input.url : String(input))
  // As `fetch` does: a Request's own headers, overridden by `init`'s.
  const headers = new Headers(input instanceof Request ? input.headers : undefined)
  new Headers(init.headers).forEach((value, name) => headers.set(name, value))
  let body: unknown = init.body ?? undefined
  if (typeof body === 'string' && headers.get('content-type')?.includes('json')) {
    body = JSON.parse(body)
  }
  return {
    url,
    path: `${url.origin}${url.pathname}`,
    method: (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
    query: Object.fromEntries(url.searchParams),
    headers,
    body,
  }
}

async function toResponse(reply: Reply, request: BackendRequest): Promise<Response> {
  const value = typeof reply === 'function' ? await (reply as (r: BackendRequest) => unknown)(request) : reply
  // A clone, so one `Response` given to `reply` can answer every request
  // (a body can be read once; ofetch's retry of a GET reads it twice).
  return value instanceof Response ? value.clone() : jsonResponse(value)
}

/**
 * The backend Nitro talks to. Replies are a value (sent as 200 JSON), a
 * `Response` (use `jsonResponse(body, status)` for errors), or a function
 * of the request returning either. `requests` lists what was sent.
 */
export const backend = {
  /** Answer every request with `reply`. */
  reply(reply: Reply): void {
    backendFetch.mockImplementation(async (input, init) => toResponse(reply, toBackendRequest(input, init)))
  },
  /** Answer the next request with `reply` (queue several by calling again). */
  replyOnce(reply: Reply): void {
    backendFetch.mockImplementationOnce(async (input, init) => toResponse(reply, toBackendRequest(input, init)))
  },
  /** Fail the next request at the network level (no HTTP status), as a refused connection does. */
  failOnce(error: Error = new TypeError('fetch failed')): void {
    backendFetch.mockImplementationOnce(async () => {
      throw error
    })
  },
  get requests(): BackendRequest[] {
    return backendFetch.mock.calls.map(([input, init]) => toBackendRequest(input, init))
  },
  get lastRequest(): BackendRequest {
    const requests = backend.requests
    const last = requests[requests.length - 1]
    if (!last) throw new Error('No backend request was made')
    return last
  },
}
