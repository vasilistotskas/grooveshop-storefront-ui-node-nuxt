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

    it('answers the session route with no shopper and ends a session from before the switch-off', async () => {
      testSession.set({
        user: { id: 42 },
        secure: { sessionToken: 'st', accessToken: 'at' },
        cartId: '0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10',
      })

      expect(await run({ url: '/api/_auth/session' }, false)).toEqual({})
      expect(testSession.data.user).toBeUndefined()
      expect(testSession.data.secure).toBeUndefined()
    })

    it('leaves a guest\'s session (their cart) alone', async () => {
      testSession.set({ cartId: '0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10' })

      expect(await run({ url: '/api/_auth/session' }, false)).toEqual({})
      expect(testSession.data).toEqual({ cartId: '0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10' })
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
