/**
 * The request's wide event carries coarse client facts (browser, OS,
 * render device class, bot, country) and never the raw User-Agent string
 * or a full browser version.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let requestHeaders: Record<string, string | undefined> = {}
const loggerSet = vi.fn()
vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('getRequestHeader', (_event: unknown, name: string) => requestHeaders[name])
vi.stubGlobal('useLogger', () => ({ set: loggerSet }))

const { default: handler } = await import('../../../../server/middleware/2.evlog-client')
const run = (headers: Record<string, string | undefined>) => {
  requestHeaders = headers
  ;(handler as unknown as (event: unknown) => void)({})
  return loggerSet.mock.calls.at(-1)?.[0]
}

const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.54 Safari/537.36'
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

describe('2.evlog-client middleware', () => {
  beforeEach(() => loggerSet.mockClear())

  it('logs the browser by name and major version, the OS by name', () => {
    const fields = run({ 'user-agent': CHROME, 'x-device-class': 'desktop', 'cf-ipcountry': 'GR' })
    expect(fields).toEqual({ client: { browser: 'Chrome 141', os: 'Windows', deviceClass: 'desktop', bot: false, country: 'GR' } })
  })

  it('never carries the raw User-Agent', () => {
    const fields = run({ 'user-agent': CHROME, 'x-device-class': 'desktop' })
    expect(JSON.stringify(fields)).not.toContain('Mozilla')
    expect(JSON.stringify(fields)).not.toContain('7390')
  })

  it('reports the class the page was rendered for, not evlog\'s own guess', () => {
    expect(run({ 'user-agent': IPAD, 'x-device-class': 'mobile' }).client.deviceClass).toBe('mobile')
  })

  it('flags crawlers', () => {
    expect(run({ 'user-agent': GOOGLEBOT, 'x-device-class': 'desktop' }).client.bot).toBe(true)
  })

  it('logs nothing without a User-Agent (a render\'s internal /api requests), rather than a wrong device class', () => {
    run({ 'x-device-class': 'desktop' })
    expect(loggerSet).not.toHaveBeenCalled()
  })

  it('omits the country when Cloudflare sent none', () => {
    expect(run({ 'user-agent': CHROME, 'x-device-class': 'desktop' }).client.country).toBeUndefined()
  })
})
