/**
 * An unpublished ContentPage is DATA, not a fault.
 *
 * Every tenant is seeded legal pages unpublished, and `useLegalPage`
 * probes for them on every render of /terms-of-use, /privacy-policy and
 * /cookies-policy so a merchant's own text can win when it exists. The
 * route used to throw Django's 404 straight through, which meant the
 * probe was never cached (a Django round-trip per SSR) and logged a
 * warning plus a stack trace each time — for the normal case. Real
 * faults then hide among them.
 *
 * These tests pin the split the fix depends on: 404 comes back as an
 * absent page, everything else still propagates so /info/[slug] can
 * tell a missing page apart from an outage.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FetchError } from 'ofetch'
import { parseDataAs } from '../../../../server/utils/parser'
import {
  zRetrieveContentPagePath,
  zRetrieveContentPageResponse,
} from '../../../../shared/openapi/zod.gen'
import type { ContentPageResponse } from '../../../../shared/types/contentPage'

vi.stubGlobal('defineCachedEventHandler', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://django/api/v1' }))
vi.stubGlobal('getValidatedRouterParams', async () => ({ slug: 'terms' }))
vi.stubGlobal('zRetrieveContentPagePath', zRetrieveContentPagePath)
// The REAL parser + generated schema, so the success path also proves
// the route's contract matches the OpenAPI schema.
vi.stubGlobal('parseDataAs', parseDataAs)
vi.stubGlobal('zRetrieveContentPageResponse', zRetrieveContentPageResponse)

const backendFetchMock = vi.fn()
vi.stubGlobal('useBackendFetch', () => backendFetchMock)
vi.stubGlobal('getRouterParams', () => ({ slug: 'terms' }))
vi.stubGlobal('tenantCacheKey', (_e: unknown, key: string) => key)

const logMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.stubGlobal('log', logMock)

class HandledError extends Error {}
const handleErrorMock = vi.fn((error: unknown) => {
  throw new HandledError(`handled: ${String(error)}`)
})
vi.stubGlobal('handleError', handleErrorMock)

const handler = (await import(
  '../../../../server/api/content-pages/[slug].get'
)).default as unknown as (event: unknown) => Promise<ContentPageResponse>

const PAGE = {
  id: 2,
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'terms',
  translations: { el: { title: 'Όροι Χρήσης', body: '<p>Κείμενο</p>' } },
  isPublished: true,
  publishedAt: '2026-09-01T10:00:00+03:00',
  createdAt: '2026-09-01T10:00:00+03:00',
  updatedAt: '2026-09-01T10:00:00+03:00',
}

function upstreamError(statusCode: number) {
  const error = new FetchError(`upstream ${statusCode}`)
  Object.assign(error, { statusCode })
  return error
}

beforeEach(() => {
  backendFetchMock.mockReset()
  handleErrorMock.mockClear()
  logMock.warn.mockClear()
  logMock.error.mockClear()
})

describe('GET /api/content-pages/[slug]', () => {
  it('wraps a published page in the response envelope', async () => {
    backendFetchMock.mockResolvedValue(PAGE)

    const result = await handler({})

    expect(result.page?.slug).toBe('terms')
    expect(handleErrorMock).not.toHaveBeenCalled()
  })

  it('returns an absent page for an upstream 404, quietly', async () => {
    backendFetchMock.mockRejectedValue(upstreamError(404))

    const result = await handler({})

    expect(result).toEqual({ page: null })
    expect(handleErrorMock).not.toHaveBeenCalled()
    expect(logMock.warn).not.toHaveBeenCalled()
    expect(logMock.error).not.toHaveBeenCalled()
  })

  it('still propagates a 5xx, so an outage is not served as a missing page', async () => {
    backendFetchMock.mockRejectedValue(upstreamError(503))

    await expect(handler({})).rejects.toBeInstanceOf(HandledError)
    expect(handleErrorMock).toHaveBeenCalledTimes(1)
  })

  it('propagates a network failure rather than masking it as absent', async () => {
    backendFetchMock.mockRejectedValue(new FetchError('fetch failed'))

    await expect(handler({})).rejects.toBeInstanceOf(HandledError)
    expect(handleErrorMock).toHaveBeenCalledTimes(1)
  })

  it('propagates a schema mismatch instead of masking it as absent', async () => {
    backendFetchMock.mockResolvedValue({ ...PAGE, slug: 42 })

    await expect(handler({})).rejects.toBeInstanceOf(HandledError)
    expect(handleErrorMock).toHaveBeenCalledTimes(1)
  })
})
