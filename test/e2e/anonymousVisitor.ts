import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { makeAllAuthConfig } from '../fixtures/allauth'
import { BROWSER_ACCEPT, requestWithHost, sendJson } from '../helpers/e2e'

/**
 * A visitor who has not signed in or added to a cart is given no session.
 *
 * On 2026-10-15 every visitor to every store got a `nuxt-session` cookie
 * on their first page: the allauth config the app loads on start, and
 * nuxt-auth-utils' session route its client plugin calls on every cached
 * page, both read the session with `getUserSession`, which creates one
 * for a request that carries none. The unit harness cannot show a cookie
 * that h3 sets, so this asks the real server, with the requests a first
 * page view makes and no cookie at all.
 *
 * Registered by test/e2e/storefront.spec.ts; the fake Django answers the
 * allauth config for this host (`anonymousVisitorUpstream`) and leaves
 * the rest to the page-render upstream.
 */
const HOST = 'anonymous-visitor.localhost'

export function anonymousVisitorUpstream(req: IncomingMessage, res: ServerResponse, reqUrl: URL): boolean {
  if (req.headers['x-forwarded-host'] !== HOST) return false
  if (!reqUrl.pathname.endsWith('/_allauth/app/v1/config')) return false
  sendJson(res, makeAllAuthConfig())
  return true
}

const sessionCookies = (setCookie: string[] | undefined) =>
  (setCookie ?? []).filter(cookie => cookie.startsWith('nuxt-session='))

/** Registered after the page renders, whose `beforeAll` waits for the server. */
export function describeAnonymousVisitor(): void {
  describe('a visitor without a session is given none', () => {
    it.each([
      ['/', BROWSER_ACCEPT],
      ['/api/_allauth/app/v1/config', {}],
      ['/api/_auth/session', {}],
      ['/api/cart', {}],
    ])('GET %s sets no session cookie', async (path, headers) => {
      const response = await requestWithHost(path, HOST, headers)

      expect(response.statusCode, response.body.slice(0, 400)).toBeLessThan(500)
      expect(sessionCookies(response.headers['set-cookie'])).toEqual([])
    })

    it('answers the session route with the empty session', async () => {
      const response = await requestWithHost('/api/_auth/session', HOST)

      expect(JSON.parse(response.body)).toEqual({})
    })
  })
}
