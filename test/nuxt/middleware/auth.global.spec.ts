import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import authMiddleware from '~/middleware/auth.global'

/**
 * The guard in front of every account route: a guest asking for a
 * protected page is sent to login with the page as `next`; everything
 * else passes. Routes are resolved by the app's REAL router, so the
 * base-name lookup (`$routeBaseName`) is the one production uses. The
 * login path follows the ACTIVE locale, which only a real navigation
 * switches — the `/en` redirect is asserted end to end in
 * test/e2e/pageRenders.ts.
 */
const { loggedIn, navigateToMock } = vi.hoisted(() => ({
  loggedIn: { value: false },
  navigateToMock: vi.fn(),
}))

mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(loggedIn.value),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
}))
mockNuxtImport('navigateTo', () => navigateToMock)

function route(path: string): RouteLocationNormalized {
  return useRouter().resolve(path) as unknown as RouteLocationNormalized
}

async function run(path: string) {
  const to = route(path)
  return await authMiddleware(to, to)
}

/** Where the guard sent the visitor, resolved back into a route. */
function redirectedTo() {
  expect(navigateToMock).toHaveBeenCalledTimes(1)
  const target = useRouter().resolve(navigateToMock.mock.calls[0]![0])
  return { path: target.path, next: target.query.next }
}

describe('auth.global middleware', () => {
  beforeEach(() => {
    loggedIn.value = false
  })

  it.each([
    ['/account', '/account/login'],
    ['/account/orders', '/account/login'],
    ['/cart/recover/0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10', '/account/login'],
    // Re-authentication confirms a signed-in shopper; allauth refuses a guest.
    ['/account/reauthenticate', '/account/login'],
    ['/account/2fa/reauthenticate/totp', '/account/login'],
    ['/account/2fa/reauthenticate/webauthn', '/account/login'],
    ['/account/2fa/reauthenticate/recovery-codes', '/account/login'],
  ])('sends a guest from %s to %s with the page as `next`', async (path, login) => {
    await run(path)

    expect(redirectedTo()).toEqual({ path: login, next: path })
  })

  // A query can hold a token or a payment session, and `next` lands in the
  // sign-in page's address (history, logs, `Referer`): only a page that
  // marks its query view state keeps it (`returnTarget`), and no protected
  // page does.
  it('carries the path of a protected page whose query is not its view, never its query', async () => {
    await run('/account?session_id=cs_live_secret')

    expect(redirectedTo()).toEqual({ path: '/account/login', next: '/account' })
  })

  // The account lists' query is their view (page, order, filter): each opts
  // in (`signInReturn: 'path-and-query'`) and comes back with it.
  it.each([
    '/account/orders?page=2&ordering=-createdAt',
    '/account/addresses?page=2',
    '/account/notifications?filter=unseen&page=2',
    '/account/reviews?page=2&ordering=-createdAt',
    '/account/favourites/posts?page=2',
    '/account/favourites/products?page=2',
  ])('carries %s with its view', async (path) => {
    await run(path)

    expect(redirectedTo()).toEqual({ path: '/account/login', next: path })
  })

  it('lets a logged-in visitor through to a protected page', async () => {
    loggedIn.value = true

    await expect(run('/account/orders')).resolves.toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it.each([['/'], ['/products'], ['/account/login'], ['/checkout']])(
    'lets a guest through to the public page %s',
    async (path) => {
      await expect(run(path)).resolves.toBeUndefined()
      expect(navigateToMock).not.toHaveBeenCalled()
    },
  )
})
