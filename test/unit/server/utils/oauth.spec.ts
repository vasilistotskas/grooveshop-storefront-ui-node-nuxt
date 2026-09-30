import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import {
  captureOAuthProcess,
  OAUTH_PROCESS_COOKIE,
  readAndClearOAuthProcess,
  redirectOAuthError,
  storeOAuthTokensAndRedirect,
} from '~~/server/utils/oauth'
import { createTestEvent, testSession } from '~~/test/helpers/nitro'

function processCookie(event: H3Event): string | undefined {
  const header = event.node.res.getHeader('set-cookie')
  return ([] as string[]).concat((header ?? []) as string[]).find(cookie => cookie.startsWith(`${OAUTH_PROCESS_COOKIE}=`))
}

function redirectOf(event: H3Event) {
  return { status: event.node.res.statusCode, location: new URL(String(event.node.res.getHeader('location')), 'https://shop.test') }
}

const withProcessCookie = (value: string) => createTestEvent({ headers: { cookie: `${OAUTH_PROCESS_COOKIE}=${value}` } })

describe('captureOAuthProcess', () => {
  it.each([
    [{ process: 'connect' }, 'connect'],
    [{ process: 'login' }, 'login'],
    [{}, 'login'],
    [{ process: 'signup-as-admin' }, 'login'],
  ])('remembers %j as "%s" for five minutes, httpOnly', (query, stored) => {
    const event = createTestEvent()

    captureOAuthProcess(event, query)

    const cookie = processCookie(event)!
    expect(cookie.split(';')[0]).toBe(`${OAUTH_PROCESS_COOKIE}=${stored}`)
    expect(cookie).toMatch(/Max-Age=300(;|$)/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
  })

  it.each([
    ['the provider callback (code)', { code: 'auth-code' }],
    ['a provider error', { error: 'access_denied' }],
  ])('leaves the cookie alone on %s', (_label, query) => {
    const event = createTestEvent()

    captureOAuthProcess(event, { ...query, process: 'connect' })

    expect(processCookie(event)).toBeUndefined()
  })
})

describe('readAndClearOAuthProcess', () => {
  it.each(['login', 'connect'])('returns the remembered "%s" and deletes the cookie', (value) => {
    const event = withProcessCookie(value)

    expect(readAndClearOAuthProcess(event)).toBe(value)
    expect(processCookie(event)).toMatch(/Max-Age=0/)
  })

  it('answers "login" when nothing was remembered', () => {
    expect(readAndClearOAuthProcess(createTestEvent())).toBe('login')
  })
})

describe('storeOAuthTokensAndRedirect', () => {
  it('stores the provider tokens in the encrypted session and redirects to the callback page', async () => {
    const event = createTestEvent()

    await storeOAuthTokensAndRedirect(event, 'google', { access_token: 'acc', id_token: 'id' }, 'client-1', 'login')

    expect(testSession.data).toEqual({
      secure: { oauthParams: { provider: 'google', access_token: 'acc', id_token: 'id', client_id: 'client-1', process: 'login' } },
    })
    const { status, location } = redirectOf(event)
    expect(status).toBe(302)
    expect(location.pathname).toBe('/account/provider/callback')
    expect(Object.fromEntries(location.searchParams)).toEqual({ provider: 'google', process: 'login' })
    // Tokens never travel in the URL.
    expect(location.search).not.toContain('acc')
  })

  it('drops null tokens and a missing client id instead of storing them', async () => {
    await storeOAuthTokensAndRedirect(createTestEvent(), 'facebook', { access_token: 'acc', id_token: null }, undefined, 'connect')

    expect(testSession.data.secure.oauthParams).toEqual({ provider: 'facebook', access_token: 'acc', process: 'connect' })
  })

  it('keeps a signed-in user\'s session for a connect flow (a bare replace forced a re-login)', async () => {
    testSession.set({ user: { id: 7 }, secure: { sessionToken: 'session-1', accessToken: 'knox-1' } })

    await storeOAuthTokensAndRedirect(createTestEvent(), 'google', { access_token: 'acc' }, 'client-1', 'connect')

    expect(testSession.data).toMatchObject({
      user: { id: 7 },
      secure: { sessionToken: 'session-1', accessToken: 'knox-1', oauthParams: { provider: 'google', process: 'connect' } },
    })
  })
})

describe('redirectOAuthError', () => {
  it.each(['google', 'facebook'])('forgets the process and sends the %s user to the callback page with the error', async (provider) => {
    const event = withProcessCookie('connect')

    await redirectOAuthError(event, provider)

    expect(processCookie(event)).toMatch(/Max-Age=0/)
    const { status, location } = redirectOf(event)
    expect(status).toBe(302)
    expect(location.pathname).toBe('/account/provider/callback')
    expect(Object.fromEntries(location.searchParams)).toEqual({ provider, error: 'oauth_error' })
  })
})
