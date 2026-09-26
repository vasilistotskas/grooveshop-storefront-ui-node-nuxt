/**
 * `requestHasSession` must answer without creating a session: reading one
 * on a request that has none mints it and sets a cookie (h3 getSession),
 * which put `nuxt-session` on every anonymous page and kept every page out
 * of the edge cache. It looks where h3 looks, header first, then cookie.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestHasSession } from '../../../../server/utils/auth'

let headers: Record<string, string> = {}
let cookies: Record<string, string> = {}
let sessionConfig: { name?: string, sessionHeader?: string | false } = {}
const event = {} as any

beforeEach(() => {
  headers = {}
  cookies = {}
  sessionConfig = { name: 'nuxt-session' }
  vi.stubGlobal('useRuntimeConfig', () => ({ session: sessionConfig }))
  vi.stubGlobal('getRequestHeader', (_event: unknown, name: string) => headers[name])
  vi.stubGlobal('getCookie', (_event: unknown, name: string) => cookies[name])
})

describe('requestHasSession', () => {
  it('is false for a request with neither the cookie nor the header', () => {
    expect(requestHasSession(event)).toBe(false)
  })

  it('finds the session cookie named in runtimeConfig.session', () => {
    cookies['nuxt-session'] = 'Fe26.2**sealed'
    expect(requestHasSession(event)).toBe(true)
  })

  it('finds the header h3 derives from the session name (x-<name>-session)', () => {
    headers['x-nuxt-session-session'] = 'Fe26.2**sealed'
    expect(requestHasSession(event)).toBe(true)
  })

  it('honours a custom session header, and ignores headers when h3 would', () => {
    sessionConfig.sessionHeader = 'x-custom'
    headers['x-custom'] = 'Fe26.2**sealed'
    expect(requestHasSession(event)).toBe(true)

    sessionConfig.sessionHeader = false
    expect(requestHasSession(event)).toBe(false)
  })

  it('fails loudly when the session is not configured, rather than guessing a name', () => {
    sessionConfig = {}
    expect(() => requestHasSession(event)).toThrow('runtimeConfig.session.name is not set')
  })
})
