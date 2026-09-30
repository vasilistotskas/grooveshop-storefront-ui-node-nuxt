import { describe, expect, it } from 'vitest'
import { getRequestHeader } from 'h3'
import middleware from '~~/server/middleware/1.device-class'
import { callHandler, createTestEvent } from '~~/test/helpers/nitro'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

/**
 * The class is a REQUEST header because Nitro's route-rule cache
 * `varies` reads request headers; the classifier itself is
 * `shared/utils/deviceClass.ts` and has its own spec.
 */
async function deviceClassFor(headers: Record<string, string>) {
  const event = createTestEvent({ headers })
  await callHandler(middleware, event)
  return getRequestHeader(event, 'x-device-class')
}

describe('server/middleware/1.device-class', () => {
  it.each([
    ['a phone', IPHONE, 'mobile'],
    ['a desktop browser', CHROME, 'desktop'],
  ])('classes %s', async (_label, ua, expected) => {
    expect(await deviceClassFor({ 'user-agent': ua })).toBe(expected)
  })

  it('classes a request without a User-Agent as desktop', async () => {
    expect(await deviceClassFor({})).toBe('desktop')
  })

  it('overwrites a client-supplied class, which would otherwise poison the cache', async () => {
    expect(await deviceClassFor({ 'user-agent': CHROME, 'x-device-class': 'mobile' })).toBe('desktop')
  })
})
