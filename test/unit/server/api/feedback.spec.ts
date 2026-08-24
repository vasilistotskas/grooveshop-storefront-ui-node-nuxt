import { beforeEach, describe, expect, it, vi } from 'vitest'
import { zCreateFeedbackBody, zCreateFeedbackResponse } from '../../../../shared/openapi/zod.gen'

// The feedback route registers a plain defineEventHandler at module scope
// and relies on Nitro auto-imports. Provide them as globals before the
// dynamic import below so the handler can be invoked directly with a
// stub event (mirrors the stubGlobal approach in content-pages.spec.ts).
const backendFetchMock = vi.fn()
let validatedBody: unknown

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://django/api/v1' }))
// Run the REAL generated body schema so the test also proves the route's
// input contract matches the OpenAPI schema.
vi.stubGlobal('readValidatedBody', async (
  _event: unknown,
  parse: (v: unknown) => unknown,
) => parse(validatedBody))
vi.stubGlobal('useBackendFetch', () => backendFetchMock)
vi.stubGlobal('parseDataAs', async (data: unknown) => data)
const forwardMock = vi.fn(() => ({ __forwarded: true }))
vi.stubGlobal('forwardUpstreamClientError', forwardMock)
vi.stubGlobal('zCreateFeedbackBody', zCreateFeedbackBody)
vi.stubGlobal('zCreateFeedbackResponse', zCreateFeedbackResponse)

const handler = (await import('../../../../server/api/feedback/index.post')).default as (
  event: unknown,
) => Promise<unknown>

const VALID_BODY = {
  rating: 5,
  category: 'products',
  message: 'The checkout was smooth and the delivery arrived early.',
  name: 'Maria',
  email: 'maria@example.com',
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    backendFetchMock.mockReset()
    forwardMock.mockClear()
    validatedBody = { ...VALID_BODY }
  })

  it('forwards a valid submission to the tenant backend /feedback endpoint', async () => {
    const created = { id: 1, uuid: 'u', ...VALID_BODY }
    backendFetchMock.mockResolvedValue(created)

    const result = await handler({})

    expect(backendFetchMock).toHaveBeenCalledWith(
      'http://django/api/v1/feedback',
      expect.objectContaining({ method: 'POST' }),
    )
    // Anonymous-optional email came through; rating preserved.
    const [, opts] = backendFetchMock.mock.calls[0] as [string, { body: typeof VALID_BODY }]
    expect(opts.body.rating).toBe(5)
    expect(result).toEqual(created)
    expect(forwardMock).not.toHaveBeenCalled()
  })

  it('accepts anonymous feedback (empty email) via the generated schema', async () => {
    validatedBody = { rating: 4, category: 'general', message: 'Nice store overall, keep it up team.', email: '' }
    backendFetchMock.mockResolvedValue({ id: 2 })

    await handler({})

    const [, opts] = backendFetchMock.mock.calls[0] as [string, { body: { email?: string } }]
    expect(opts.body.email).toBe('')
    expect(forwardMock).not.toHaveBeenCalled()
  })

  it('delegates an upstream 4xx to forwardUpstreamClientError', async () => {
    const upstream = { statusCode: 400, data: { non_field_errors: ['spam'] } }
    backendFetchMock.mockRejectedValue(upstream)

    const result = await handler({})

    expect(forwardMock).toHaveBeenCalledWith(upstream)
    expect(result).toEqual({ __forwarded: true })
  })

  it('rejects an out-of-range rating before hitting the backend', async () => {
    validatedBody = { ...VALID_BODY, rating: 9 }

    await handler({})

    // Schema parse throws -> caught -> delegated, backend never called.
    expect(backendFetchMock).not.toHaveBeenCalled()
    expect(forwardMock).toHaveBeenCalledTimes(1)
  })
})
