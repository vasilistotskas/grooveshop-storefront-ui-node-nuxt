/**
 * A store without customer accounts (`features.customerAccounts` off) has
 * no sign-in, no account and no identity provider: Django answers 404 on
 * every one of them, and the storefront answers the same itself instead
 * of asking. A visitor's session from before the switch-off is ended,
 * since Django no longer accepts it; a guest's own session (the cart) is
 * left alone.
 */
import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/1.customer-accounts'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, callHandler, createTestEvent, testSession } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

const withAccounts = (on: boolean) => {
  const tenant = validTenantConfig('shop.test')
  return { ...tenant, features: { ...tenant.features, customerAccounts: on } }
}

const run = (req: TestRequest, accounts: boolean) =>
  callHandler(middleware, createTestEvent({ ...req, context: { tenant: withAccounts(accounts), ...req.context } }))

const ACCOUNT_SURFACES = [
  ['GET', '/api/_allauth/app/v1/config'],
  ['POST', '/api/_allauth/app/v1/auth/login'],
  ['POST', '/api/_allauth/app/v1/auth/signup'],
  ['GET', '/api/_allauth/app/v1/auth/session'],
  ['GET', '/api/auth/oauth-params'],
  ['GET', '/auth/google'],
  ['GET', '/auth/facebook?code=abc'],
  ['GET', '/api/user/account/7'],
  ['GET', '/api/user/account/summary'],
  ['GET', '/api/user/addresses'],
  ['GET', '/api/user/email-preferences'],
  ['GET', '/api/notification/user/unseen-count'],
  ['GET', '/api/websocket/user/ticket'],
  ['GET', '/api/subscriptions/user'],
  ['GET', '/.well-known/oauth-protected-resource'],
  ['GET', '/.well-known/oauth-protected-resource/mcp'],
] as const

describe('server/middleware/1.customer-accounts', () => {
  describe('a store without customer accounts', () => {
    it.each(ACCOUNT_SURFACES)('answers %s %s with 404, asking Django nothing', async (method, url) => {
      await expect(run({ method, url }, false)).rejects.toMatchObject({ statusCode: 404 })
      expect(backend.requests).toEqual([])
    })

    it.each([
      ['GET', '/api/orders/5?uuid=0b6e'],
      ['POST', '/api/orders'],
      ['GET', '/api/cart'],
      ['POST', '/api/subscriptions/newsletter'],
      ['GET', '/api/products'],
      ['GET', '/checkout'],
      ['GET', '/.well-known/api-catalog'],
      ['GET', '/api/users'],
      ['GET', '/authors'],
    ])('lets the guest surface %s %s through', async (method, url) => {
      await expect(run({ method, url }, false)).resolves.toBeUndefined()
    })

    describe('a session from before the switch-off', () => {
      const CART = '0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10'
      const PAGE = { url: '/checkout', headers: { accept: 'text/html,application/xhtml+xml' } }
      const signedIn = (extra: Record<string, unknown> = {}) => testSession.set({
        user: { id: 42 },
        secure: { sessionToken: 'st', accessToken: 'at' },
        ...extra,
      })

      // The page's own request is the one whose response the browser
      // gets: the session the SSR render asks for goes through an internal
      // fetch whose `Set-Cookie` never leaves the server.
      it('ends the signed-in identity on the page request, keeping the cart', async () => {
        signedIn({ cartId: CART, viewedPosts: ['7'] })

        await expect(run(PAGE, false)).resolves.toBeUndefined()

        expect(testSession.data).toEqual({ cartId: CART, viewedPosts: ['7'] })
        // Rewritten with the cart's own cookie lifetime, as a cart write is.
        expect(testSession.writeConfig).toMatchObject({ cookie: { maxAge: 60 * 60 * 24 * 30 } })
      })

      it('ends a session that held nothing but the identity', async () => {
        signedIn()

        await run(PAGE, false)

        expect(testSession.data).toEqual({})
      })

      it('answers the session route with no shopper, writing nothing there', async () => {
        signedIn({ cartId: CART })

        expect(await run({ url: '/api/_auth/session' }, false)).toEqual({})
        expect(testSession.data.user).toEqual({ id: 42 })
      })

      // A guest cart built since the switch-off lives in the same session:
      // no request may drop it.
      it.each([
        ['the page request', PAGE],
        ['the session route', { url: '/api/_auth/session' }],
        ['a cart request', { url: '/api/cart' }],
      ])('leaves a guest’s cart alone on %s', async (_label, req) => {
        testSession.set({ cartId: CART })

        await run(req, false)

        expect(testSession.data).toEqual({ cartId: CART })
      })

      it('leaves the session to the module on a store with accounts', async () => {
        signedIn({ cartId: CART })

        await run(PAGE, true)

        expect(testSession.data.user).toEqual({ id: 42 })
      })
    })
  })

  describe('a store with customer accounts', () => {
    it.each(ACCOUNT_SURFACES)('lets %s %s through', async (method, url) => {
      await expect(run({ method, url }, true)).resolves.toBeUndefined()
    })

    it('leaves the session route to the module', async () => {
      testSession.set({ user: { id: 42 }, secure: { sessionToken: 'st' } })

      expect(await run({ url: '/api/_auth/session' }, true)).toBeUndefined()
      expect(testSession.data.user).toEqual({ id: 42 })
    })
  })

  it('decides nothing without a resolved store (a bypassed path)', async () => {
    await expect(callHandler(middleware, createTestEvent({ url: '/api/_allauth/app/v1/config' }))).resolves.toBeUndefined()
  })
})
