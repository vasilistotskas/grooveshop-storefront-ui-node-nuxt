import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  zIncrementProductViewsPath,
  zIncrementProductViewsResponse,
} from '../../../../shared/openapi/zod.gen'

// Django throttles view counting per visitor (`ViewCountThrottle`). A
// bare `$fetch` reaches it as this pod, which would put every anonymous
// visitor in one bucket and silently stop the counter once it filled.
// `useBackendFetch()` relays the visitor's identity, so the route must
// go through it.
const backendFetchMock = vi.fn()
const bareFetchMock = vi.fn()

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://django/api/v1' }))
vi.stubGlobal('getValidatedRouterParams', async (
  _event: unknown,
  parse: (v: unknown) => unknown,
) => parse({ id: 42 }))
vi.stubGlobal('useBackendFetch', () => backendFetchMock)
vi.stubGlobal('$fetch', bareFetchMock)
vi.stubGlobal('parseDataAs', async (data: unknown) => data)
vi.stubGlobal('handleError', vi.fn())
vi.stubGlobal('zIncrementProductViewsPath', zIncrementProductViewsPath)
vi.stubGlobal('zIncrementProductViewsResponse', zIncrementProductViewsResponse)

const handler = (await import('../../../../server/api/products/[id]/update-view-count.post')).default as (
  event: unknown,
) => Promise<unknown>

describe('POST /api/products/:id/update-view-count', () => {
  beforeEach(() => {
    backendFetchMock.mockReset()
    bareFetchMock.mockReset()
  })

  it('counts the view through the identity-forwarding backend fetch', async () => {
    backendFetchMock.mockResolvedValue({ viewCount: 7 })

    const result = await handler({})

    expect(backendFetchMock).toHaveBeenCalledWith(
      'http://django/api/v1/product/42/update_view_count',
      { method: 'POST' },
    )
    expect(bareFetchMock).not.toHaveBeenCalled()
    expect(result).toEqual({ viewCount: 7 })
  })
})
