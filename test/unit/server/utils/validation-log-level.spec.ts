/**
 * A malformed REQUEST and a drifted RESPONSE both reach `handleError` as a
 * 4xx `H3Error` carrying a `ZodError`, and they are opposites.
 *
 * Production, 48h to 2026-09-08: every `action: 'validation'` line at error
 * level came from one WordPress scanner sending
 * `?page=gravitysmtp-settings` to `/api/blog/posts`, and not one of them
 * said which route or which field had failed. Meanwhile the genuine article
 * — Django and `shared/openapi` disagreeing about `weightInfo`, which 422'd
 * every add-to-cart for a zero-weight product until django v3.29.3 — logged
 * at the same level with the same absent detail, and its request event was
 * additionally downgraded to `warn` by the evlog plugin because 422 is a
 * 4xx.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ZodError, z } from 'zod'
import { createError, H3Error } from 'h3'
import { handleError } from '../../../../server/utils/error'
import { parseDataAs, isResponseContractError } from '../../../../server/utils/parser'
import { isClientError } from '../../../../server/utils/http-status'

const mockLog = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

const ISSUE = {
  code: 'invalid_format' as const,
  format: 'regex' as const,
  pattern: '/^-?\\d+$/',
  path: ['page'],
  message: 'Invalid string: must match pattern /^-?\\d+$/',
  input: 'gravitysmtp-settings',
}

/** What h3's `getValidatedQuery` throws when the inbound parse fails. */
function inboundValidationError() {
  return createError({
    statusCode: 400,
    statusMessage: 'Validation Error',
    data: new ZodError([ISSUE]),
  })
}

/** What `parseDataAs` throws when a Django response fails its schema. */
async function responseContractError() {
  try {
    await parseDataAs({ weightInfo: null }, z.object({ weightInfo: z.object({}) }))
  }
  catch (error) {
    return error
  }
  throw new Error('parseDataAs was expected to reject')
}

function stubServerGlobals(event?: { method: string, path: string }) {
  vi.stubGlobal('log', mockLog)
  vi.stubGlobal('isClientError', isClientError)
  vi.stubGlobal('isResponseContractError', isResponseContractError)
  vi.stubGlobal('createError', createError)
  vi.stubGlobal('useEvent', () => event)
}

function run(error: unknown) {
  try {
    handleError(error)
  }
  catch {
    // handleError always throws; the log call is what is under test.
  }
}

describe('validation log levels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('files a malformed request as a warning, not an error', () => {
    stubServerGlobals({ method: 'GET', path: '/api/blog/posts?page=gravitysmtp-settings' })

    run(inboundValidationError())

    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'validation:request' }),
    )
    expect(mockLog.error).not.toHaveBeenCalled()
  })

  it('keeps a drifted response at error level', async () => {
    stubServerGlobals({ method: 'POST', path: '/api/cart/items' })

    run(await responseContractError())

    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'validation:response' }),
    )
    expect(mockLog.warn).not.toHaveBeenCalled()
  })

  it('names the route that failed', () => {
    stubServerGlobals({ method: 'GET', path: '/api/blog/posts?page=gravitysmtp-settings' })

    run(inboundValidationError())

    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', route: '/api/blog/posts' }),
    )
  })

  it('names the field and the rule, and never the value', () => {
    stubServerGlobals({ method: 'GET', path: '/api/blog/posts?page=gravitysmtp-settings' })

    run(inboundValidationError())

    const logged = mockLog.warn.mock.calls[0]![0]
    expect(logged.issues).toEqual([
      {
        path: 'page',
        code: 'invalid_format',
        message: 'Invalid string: must match pattern /^-?\\d+$/',
      },
    ])
    // The query string and the ZodError's `input` both carry what was sent.
    expect(JSON.stringify(logged)).not.toContain('gravitysmtp-settings')
  })

  it('reports one event per failure', () => {
    stubServerGlobals({ method: 'GET', path: '/api/blog/posts' })

    run(inboundValidationError())

    // Falling through to the H3Error branch logged the same failure twice,
    // once as `validation` and again as `h3`.
    expect(mockLog.warn).toHaveBeenCalledTimes(1)
    expect(mockLog.error).not.toHaveBeenCalled()
  })

  it('survives having no request to describe', () => {
    // A cached handler revalidating in the background has no event, and
    // `useEvent()` throws outside a request rather than returning undefined.
    stubServerGlobals()
    vi.stubGlobal('useEvent', () => {
      throw new Error('no request context')
    })

    run(inboundValidationError())

    expect(mockLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'validation:request' }),
    )
    const logged = mockLog.warn.mock.calls[0]![0]
    expect(logged.route).toBeUndefined()
  })

  it('rethrows h3 errors untouched so the status survives', () => {
    stubServerGlobals({ method: 'GET', path: '/api/blog/posts' })
    const original = inboundValidationError()

    expect(() => handleError(original)).toThrow(original)
    expect(original).toBeInstanceOf(H3Error)
    expect(original.statusCode).toBe(400)
  })
})

describe('isResponseContractError', () => {
  it('brands only what parseDataAs raised', async () => {
    expect(isResponseContractError(await responseContractError())).toBe(true)
    expect(isResponseContractError(inboundValidationError())).toBe(false)
    expect(isResponseContractError(new ZodError([ISSUE]))).toBe(false)
    expect(isResponseContractError(null)).toBe(false)
    expect(isResponseContractError('nope')).toBe(false)
  })

  it('keeps the brand off the wire', async () => {
    const error = await responseContractError()
    expect(Object.keys(error as object)).not.toContain('responseContract')
    expect(JSON.stringify(error)).not.toContain('responseContract')
  })
})
