import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The attachment upload is the one route that PROXIES. Three things
 * have to stay true, and each of them is a bug that would not show up
 * as an error:
 *
 * 1. `streamRequest: true` — without it h3 buffers the whole file in
 *    this process before forwarding it, which is the entire reason
 *    this route is not written like its siblings.
 * 2. The tenant headers are set by hand. `useBackendFetch` cannot be
 *    used here (`sendProxy` needs a real `fetch`), and the global
 *    `$fetch` patch does not cover `globalThis.fetch`, so without
 *    them Django files the upload in the PUBLIC schema.
 * 3. The body is never read. Reading it would consume the stream and
 *    silently turn the proxy back into a buffering one.
 */
const proxyMock = vi.fn(() => Promise.resolve({ proxied: true }))
const readBodyMock = vi.fn()
let headers: Record<string, string> = {}

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => ({
  apiBaseUrl: 'http://django/api/v1',
  contactAttachmentMaxBytes: 25 * 1024 * 1024,
}))
vi.stubGlobal('getRequestHeader', (_event: unknown, name: string) =>
  headers[name.toLowerCase()],
)
vi.stubGlobal('getRequestHost', () => 'delta-sigma.gr')
vi.stubGlobal('proxyRequest', proxyMock)
vi.stubGlobal('readRawBody', readBodyMock)
vi.stubGlobal('readMultipartFormData', readBodyMock)
vi.stubGlobal('createError', (init: Record<string, unknown>) => {
  const error = new Error(String(init.statusMessage ?? 'error'))
  Object.assign(error, init)
  return error
})

const handler = (await import('../../../../server/api/contact/attachment.post'))
  .default as (event: unknown) => Promise<unknown>

const EVENT = { context: { locale: 'el' } }

describe('POST /api/contact/attachment', () => {
  beforeEach(() => {
    proxyMock.mockClear()
    readBodyMock.mockClear()
    headers = { 'content-length': String(2 * 1024 * 1024) }
  })

  it('streams the upload to the tenant backend', async () => {
    const result = await handler(EVENT)

    expect(result).toEqual({ proxied: true })
    const [, target, opts] = proxyMock.mock.calls[0] as [
      unknown,
      string,
      { streamRequest?: boolean, headers?: Record<string, string> },
    ]
    expect(target).toBe('http://django/api/v1/contact/attachment')
    // The whole point of the route.
    expect(opts.streamRequest).toBe(true)
  })

  it('forwards the tenant host, the proto and the locale', async () => {
    await handler(EVENT)

    const [, , opts] = proxyMock.mock.calls[0] as [
      unknown,
      string,
      { headers: Record<string, string> },
    ]
    expect(opts.headers['X-Forwarded-Host']).toBe('delta-sigma.gr')
    // SECURE_SSL_REDIRECT would 301 in-cluster, and a 301 loses the body.
    expect(opts.headers['X-Forwarded-Proto']).toBe('https')
    expect(opts.headers['X-Language']).toBe('el')
  })

  it('falls back to the default locale when the request carries none', async () => {
    await handler({ context: {} })

    const [, , opts] = proxyMock.mock.calls[0] as [
      unknown,
      string,
      { headers: Record<string, string> },
    ]
    expect(opts.headers['X-Language']).toBeTruthy()
  })

  it('never reads the body, which would consume the stream', async () => {
    await handler(EVENT)

    expect(readBodyMock).not.toHaveBeenCalled()
  })

  it('refuses a declared size over the ceiling before opening a stream', async () => {
    headers = { 'content-length': String(30 * 1024 * 1024) }

    await expect(handler(EVENT)).rejects.toMatchObject({ statusCode: 413 })
    expect(proxyMock).not.toHaveBeenCalled()
  })

  it('lets an undeclared size through for Django to measure', async () => {
    // `Content-Length` is a claim. A chunked body has none at all, and
    // refusing it here would break a legitimate upload; Django
    // re-derives the true size from the bytes it writes.
    headers = {}

    await handler(EVENT)

    expect(proxyMock).toHaveBeenCalledTimes(1)
  })
})
