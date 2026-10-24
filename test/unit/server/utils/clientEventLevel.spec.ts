import { describe, expect, it } from 'vitest'
import { isConnectionFailure, warnOnConnectionFailure } from '~~/server/utils/clientEventLevel'

/**
 * A store site's `log.error({ action, error })` as evlog's browser
 * serializer sends it: ofetch's `FetchError` with the browser's own
 * `TypeError` as its cause, and no status when nothing answered.
 */
const noResponse = (message: string) => ({
  name: 'FetchError',
  message: `[GET] "/api/cart": <no response> ${message}`,
  cause: { name: 'TypeError', message },
})

describe('server/utils/clientEventLevel', () => {
  it.each(['Load failed', 'Failed to fetch', 'NetworkError when attempting to fetch resource.', 'A network error occurred.'])(
    'sends a store site\'s "%s" at warn',
    (message) => {
      const event = { level: 'error', source: 'client', action: 'cart:setup', error: noResponse(message) }

      warnOnConnectionFailure(event)

      expect(event.level).toBe('warn')
    },
  )

  it('sends a chunk that would not download at warn', () => {
    const event = { level: 'error', error: { name: 'TypeError', message: 'Failed to fetch dynamically imported module: https://shop.test/_nuxt/a.js' } }

    warnOnConnectionFailure(event)

    expect(event.level).toBe('warn')
  })

  it.each([
    ['a request that got an answer', { ...noResponse('Failed to fetch'), statusCode: 500, status: 500 }],
    ['an error that only mentions a failed fetch', { name: 'TypeError', message: 'cart: Failed to fetch the totals' }],
    ['a plain bug', { name: 'TypeError', message: 'Cannot read properties of undefined (reading \'id\')' }],
    ['no error at all', undefined],
  ])('keeps %s at error', (_name, error) => {
    const event = { level: 'error', error }

    warnOnConnectionFailure(event)

    expect(event.level).toBe('error')
  })

  it('leaves a level other than error alone', () => {
    const event = { level: 'info', error: noResponse('Load failed') }

    warnOnConnectionFailure(event)

    expect(event.level).toBe('info')
  })

  it('stops following a cause chain that loops', () => {
    const looped: Record<string, unknown> = { name: 'Error', message: 'outer' }
    looped.cause = looped

    expect(isConnectionFailure(looped)).toBe(false)
  })
})
