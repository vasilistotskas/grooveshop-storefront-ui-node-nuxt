/**
 * Unit tests for server/middleware/0.markdown-negotiation.ts
 *
 * Covers the Accept: text/markdown interception, skip conditions, and —
 * for the multi-tenant .md-mirror fix — that the internal event.fetch()
 * call to the .md route forwards the original request's Host header (h3
 * already does this automatically for relative-path fetches, but this is
 * pinned explicitly so downstream tenant resolution keeps working across
 * h3 upgrades) and the internal-negotiation marker header.
 *
 * This module imports getHeader/getRequestHost/setHeader explicitly from
 * 'h3' (not Nitro auto-imports), so they must be mocked via vi.mock('h3')
 * rather than vi.stubGlobal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const hostMock = vi.fn().mockReturnValue('tenant-a.example')
const setHeaderMock = vi.fn()

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getHeader: (event: { __headers?: Record<string, string> }, name: string) =>
      event.__headers?.[name.toLowerCase()],
    getRequestHost: hostMock,
    setHeader: setHeaderMock,
  }
})

const module = await import('../../../../server/middleware/0.markdown-negotiation')
const handler = (module.default ?? module) as unknown as (event: unknown) => Promise<string | undefined>

function makeEvent(path: string, opts: {
  accept?: string
  internal?: boolean
  fetchImpl?: () => Promise<Response>
} = {}) {
  const headers: Record<string, string> = {}
  if (opts.accept !== undefined) headers.accept = opts.accept
  if (opts.internal) headers['x-md-negotiation-internal'] = '1'

  const fetchImpl = opts.fetchImpl ?? (async () => new Response('# Markdown body', { status: 200 }))

  return {
    path,
    method: 'GET',
    fetch: vi.fn(fetchImpl),
    __headers: headers,
  }
}

describe('0.markdown-negotiation middleware', () => {
  beforeEach(() => {
    hostMock.mockReturnValue('tenant-a.example')
    setHeaderMock.mockReset()
  })

  it('does nothing when Accept does not include text/markdown', async () => {
    const event = makeEvent('/products', { accept: 'text/html' })
    const result = await handler(event)
    expect(result).toBeUndefined()
    expect(event.fetch).not.toHaveBeenCalled()
  })

  it('skips internal recursion (x-md-negotiation-internal already set)', async () => {
    const event = makeEvent('/products', { accept: 'text/markdown', internal: true })
    const result = await handler(event)
    expect(result).toBeUndefined()
    expect(event.fetch).not.toHaveBeenCalled()
  })

  it('skips paths with a dot (already has an extension)', async () => {
    const event = makeEvent('/robots.txt', { accept: 'text/markdown' })
    await handler(event)
    expect(event.fetch).not.toHaveBeenCalled()
  })

  it('skips SKIP_PREFIXES paths (e.g. /api/)', async () => {
    const event = makeEvent('/api/products', { accept: 'text/markdown' })
    await handler(event)
    expect(event.fetch).not.toHaveBeenCalled()
  })

  it('forwards the original request Host and the internal marker on the internal fetch', async () => {
    const event = makeEvent('/products', { accept: 'text/markdown' })
    await handler(event)

    expect(event.fetch).toHaveBeenCalledWith('/products.md', {
      headers: {
        'x-md-negotiation-internal': '1',
        host: 'tenant-a.example',
      },
    })
  })

  it('maps the bare root path to /index.md', async () => {
    const event = makeEvent('/', { accept: 'text/markdown' })
    await handler(event)
    expect(event.fetch).toHaveBeenCalledWith('/index.md', expect.anything())
  })

  it('returns the markdown body with the correct headers on success', async () => {
    const event = makeEvent('/products', { accept: 'text/markdown' })
    const result = await handler(event)

    expect(result).toBe('# Markdown body')
    expect(setHeaderMock).toHaveBeenCalledWith(event, 'content-type', 'text/markdown; charset=utf-8')
    expect(setHeaderMock).toHaveBeenCalledWith(event, 'vary', 'Accept')
  })

  it('returns undefined when the internal fetch rejects', async () => {
    const event = makeEvent('/products', { accept: 'text/markdown' })
    event.fetch = vi.fn(async () => { throw new Error('network error') })

    const result = await handler(event)
    expect(result).toBeUndefined()
  })

  it('returns undefined when the upstream response is not ok', async () => {
    const event = makeEvent('/products', {
      accept: 'text/markdown',
      fetchImpl: async () => new Response('Not found', { status: 404 }),
    })
    const result = await handler(event)
    expect(result).toBeUndefined()
  })
})
