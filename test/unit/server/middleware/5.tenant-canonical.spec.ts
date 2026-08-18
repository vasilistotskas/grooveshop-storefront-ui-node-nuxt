/**
 * Unit tests for server/middleware/5.tenant-canonical.ts
 *
 * Regression guard for the multi-tenant canonical redirect: the
 * @nuxtjs/seo `redirectToCanonicalSiteUrl` module middleware compared
 * every request host against the env-frozen platform site URL and
 * 301'd every other tenant's storefront onto tenant #1's domain. The
 * replacement must canonicalize each tenant onto its OWN
 * primaryDomain — and never touch API routes, mutations, or requests
 * without tenant context.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

interface TestEvent {
  context: Record<string, unknown>
  method: string
  path: string
  headers: Record<string, string>
}

let handler: (event: TestEvent) => unknown
let redirect: { to?: string, code?: number }

function makeEvent(options: {
  tenant?: Record<string, unknown>
  host?: string
  method?: string
  path?: string
}): TestEvent {
  return {
    context: options.tenant ? { tenant: options.tenant } : {},
    method: options.method ?? 'GET',
    path: options.path ?? '/',
    headers: { host: options.host ?? 'acme.example' },
  }
}

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (fn: typeof handler) => fn)
  vi.stubGlobal('getRequestHost', (event: TestEvent) => event.headers.host)
  vi.stubGlobal(
    'sendRedirect',
    (_event: TestEvent, to: string, code: number) => {
      redirect = { to, code }
      return 'redirected'
    },
  )
  handler = (await import('../../../../server/middleware/5.tenant-canonical'))
    .default as unknown as typeof handler
})

afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  redirect = {}
})

const ACME = { primaryDomain: 'acme.example' }

describe('5.tenant-canonical middleware', () => {
  it('passes through requests on the tenant primary domain', () => {
    const result = handler(makeEvent({ tenant: ACME, host: 'acme.example' }))
    expect(result).toBeUndefined()
    expect(redirect.to).toBeUndefined()
  })

  it('301s alias hosts onto the tenant primary domain, preserving the path', () => {
    const result = handler(
      makeEvent({
        tenant: ACME,
        host: 'alias.example',
        path: '/products/3?x=1',
      }),
    )
    expect(result).toBe('redirected')
    expect(redirect.to).toBe('https://acme.example/products/3?x=1')
    expect(redirect.code).toBe(301)
  })

  it('never redirects a DIFFERENT tenant onto the platform domain (the original bug)', () => {
    // tenant2 resolved on its own primary host must NOT be redirected
    // anywhere, no matter what the platform site URL env says.
    const result = handler(
      makeEvent({
        tenant: { primaryDomain: 'tenant2-staging.webside.gr' },
        host: 'tenant2-staging.webside.gr',
      }),
    )
    expect(result).toBeUndefined()
    expect(redirect.to).toBeUndefined()
  })

  it('strips ports before comparing hosts', () => {
    const result = handler(
      makeEvent({ tenant: ACME, host: 'acme.example:3000' }),
    )
    expect(result).toBeUndefined()
  })

  it('skips API routes even on alias hosts', () => {
    const result = handler(
      makeEvent({ tenant: ACME, host: 'alias.example', path: '/api/cart' }),
    )
    expect(result).toBeUndefined()
  })

  it('skips non-GET/HEAD methods', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const result = handler(
        makeEvent({ tenant: ACME, host: 'alias.example', method }),
      )
      expect(result).toBeUndefined()
    }
  })

  it('redirects HEAD like GET', () => {
    handler(makeEvent({ tenant: ACME, host: 'alias.example', method: 'HEAD' }))
    expect(redirect.code).toBe(301)
  })

  it('does nothing without tenant context or primaryDomain', () => {
    expect(handler(makeEvent({ host: 'alias.example' }))).toBeUndefined()
    expect(
      handler(makeEvent({ tenant: {}, host: 'alias.example' })),
    ).toBeUndefined()
    expect(redirect.to).toBeUndefined()
  })
})
