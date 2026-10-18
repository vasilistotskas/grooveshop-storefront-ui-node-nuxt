import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { requestWithHost, sendJson } from '../helpers/e2e'
import { makeSessionResponse } from '../fixtures/allauth'
import { makeUserDetails } from '../fixtures/user'

/**
 * Does signing out let the visitor sign in again?
 *
 * It did not. The cart id lives in the same `nuxt-session` cookie as the
 * allauth session token, and the sign-out cleared the two side by side:
 * the cart clear read the session before the user clear emptied it and
 * wrote it back, old token included. The next sign-in sent that dead
 * token, allauth answered 410 and the visitor read "your session
 * expired" (webside, 2026-10-18).
 *
 * Only a real server shows it: the unit harness keeps one session object,
 * while h3 gives each session config its own copy and the last write to
 * the cookie wins. So this signs in, out and in again through the real
 * routes, carrying the cookie the way a browser does, against a fake
 * allauth that refuses a dead token exactly as allauth does.
 *
 * Registered by test/e2e/storefront.spec.ts; harness: test/helpers/e2e.ts.
 */

const HOST = 'sign-out.localhost'
const AUTH = '/_allauth/app/v1/auth'
const USER_ID = 7

const live = new Set<string>()
let issued = 0

/** A fake allauth for HOST: a fresh token per sign-in, refused once signed out. */
export function signOutUpstream(req: IncomingMessage, res: ServerResponse, url: URL): boolean {
  if (req.headers['x-forwarded-host'] !== HOST) return false
  // The account a sign-in loads for the signed-in user.
  if (url.pathname === `/api/v1/user/account/${USER_ID}`) {
    sendJson(res, makeUserDetails({ id: USER_ID }))
    return true
  }
  if (!url.pathname.startsWith(AUTH)) return false
  const token = req.headers['x-session-token']
  const sent = typeof token === 'string' ? token : undefined

  if (sent && !live.has(sent)) {
    sendJson(res, { status: 410, data: { flows: [] }, meta: { is_authenticated: false } }, 410)
    return true
  }
  if (url.pathname === `${AUTH}/login` && req.method === 'POST') {
    const fresh = `token-${++issued}`
    live.add(fresh)
    sendJson(res, { ...makeSessionResponse({ user: { id: USER_ID } }), meta: { is_authenticated: true, session_token: fresh } })
    return true
  }
  if (url.pathname === `${AUTH}/session` && req.method === 'DELETE') {
    // A sign-out that forwards no live token signs nobody out, and the
    // test below would pass on a session that was never ended.
    if (!sent) {
      sendJson(res, { status: 400, errors: [{ message: 'sign-out sent no session token' }] }, 400)
      return true
    }
    live.delete(sent)
    sendJson(res, { status: 401, data: { flows: [] }, meta: { is_authenticated: false } }, 401)
    return true
  }
  return false
}

/** A browser's cookie jar for one visitor: keeps what each response sets. */
function cookieJar() {
  const cookies = new Map<string, string>()
  return {
    header: () => [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
    keep(setCookie: string[] | undefined) {
      for (const cookie of setCookie ?? []) {
        const [pair] = cookie.split(';')
        const [name, ...rest] = pair!.split('=')
        const value = rest.join('=')
        if (value && !/Max-Age=0/i.test(cookie)) cookies.set(name!.trim(), value)
        else cookies.delete(name!.trim())
      }
    },
  }
}

export function describeSignOut(): void {
  describe('signing out and in again', () => {
    it('signs the visitor in again right after they signed out', async () => {
      const jar = cookieJar()
      const send = async (method: string, path: string, body?: unknown) => {
        const response = await requestWithHost(path, HOST, {
          'Content-Type': 'application/json',
          'Cookie': jar.header(),
        }, { method, body: body === undefined ? undefined : JSON.stringify(body) })
        jar.keep(response.headers['set-cookie'])
        return response
      }
      const credentials = { email: 'shopper@example.com', password: 'a-test-password' }

      const first = await send('POST', '/api/_allauth/app/v1/auth/login', credentials)
      expect(first.statusCode, first.body.slice(0, 600)).toBe(200)

      const signOut = await send('DELETE', '/api/_allauth/app/v1/auth/session')
      expect(signOut.statusCode, signOut.body.slice(0, 600)).toBe(401)
      expect(live.size, 'the sign-out ended the session at allauth').toBe(0)

      const again = await send('POST', '/api/_allauth/app/v1/auth/login', credentials)
      expect(again.statusCode, again.body.slice(0, 600)).toBe(200)
    }, 120000)
  })
}
