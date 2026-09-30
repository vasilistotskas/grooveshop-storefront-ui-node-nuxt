/**
 * The request's wide event carries coarse client facts (browser, OS,
 * render device class, bot, country) and never the raw User-Agent string
 * or a full browser version.
 */
import { describe, expect, it } from 'vitest'
import middleware, { CACHE_WARM_HEADER } from '~~/server/middleware/2.evlog-client'
import { CACHE_WARM_HEADER as SCRIPT_CACHE_WARM_HEADER } from '~~/scripts/warm-cache.mjs'
import { callHandler, createTestEvent, loggerOf } from '~~/test/helpers/nitro'

async function run(headers: Record<string, string>) {
  const event = createTestEvent({ headers })
  await callHandler(middleware, event)
  return loggerOf(event).fields as { client?: Record<string, unknown> }
}

const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.54 Safari/537.36'
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

describe('server/middleware/2.evlog-client', () => {
  it('logs the browser by name and major version, the OS by name', async () => {
    const fields = await run({ 'user-agent': CHROME, 'x-device-class': 'desktop', 'cf-ipcountry': 'GR' })

    expect(fields).toEqual({ client: { browser: 'Chrome 141', os: 'Windows', deviceClass: 'desktop', bot: false, country: 'GR', cacheWarm: false } })
  })

  it('never carries the raw User-Agent', async () => {
    const fields = JSON.stringify(await run({ 'user-agent': CHROME, 'x-device-class': 'desktop' }))

    expect(fields).not.toContain('Mozilla')
    expect(fields).not.toContain('7390')
  })

  it('reports the class the page was rendered for, not evlog\'s own guess', async () => {
    expect((await run({ 'user-agent': IPAD, 'x-device-class': 'mobile' })).client?.deviceClass).toBe('mobile')
  })

  it('flags crawlers', async () => {
    expect((await run({ 'user-agent': GOOGLEBOT, 'x-device-class': 'desktop' })).client?.bot).toBe(true)
  })

  it('logs nothing without a User-Agent (a render\'s internal /api requests), rather than a wrong device class', async () => {
    expect(await run({ 'x-device-class': 'desktop' })).toEqual({})
  })

  it('records the device class Cloudflare sent beside ours, without using it', async () => {
    const { client } = await run({ 'user-agent': IPAD, 'x-device-class': 'tablet', 'cf-device-type': 'mobile' })

    expect(client?.deviceClass).toBe('tablet')
    expect(client?.edgeDeviceClass).toBe('mobile')
  })

  it('omits the country when Cloudflare sent none', async () => {
    expect((await run({ 'user-agent': CHROME, 'x-device-class': 'desktop' })).client?.country).toBeUndefined()
  })

  it('marks the cache warm-up, using the header name the warm-up script sends', async () => {
    expect(CACHE_WARM_HEADER).toBe(SCRIPT_CACHE_WARM_HEADER)
    expect((await run({ 'user-agent': CHROME, 'x-device-class': 'desktop', [CACHE_WARM_HEADER]: '1' })).client?.cacheWarm).toBe(true)
  })
})
