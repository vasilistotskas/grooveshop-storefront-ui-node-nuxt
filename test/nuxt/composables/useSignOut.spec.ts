import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

/**
 * Signing out, from the header menu, the account sidebar and the
 * overview alike. It leaves a protected page first, marks the logout as
 * the shopper's own BEFORE the request (so a racing 410 does not raise a
 * "session expired" toast), and leaves the rest to the auth plugin's
 * LOGGED_OUT cascade — no cart refresh of its own, which raced the
 * server's cleanup into a phantom anonymous cart.
 */
const { deleteSession, navigateToMock, toastAdd, route } = vi.hoisted(() => ({
  deleteSession: vi.fn((_opts: unknown) => Promise.resolve({ status: 401 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
  route: { name: 'index___el' as string | undefined, path: '/', fullPath: '/', params: {}, query: {}, hash: '', meta: {}, matched: [] },
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ deleteSession }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useRoute', () => () => route)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

beforeEach(() => {
  route.name = 'index___el'
  useState('auth:userInitiatedLogout').value = false
})

describe('useSignOut', () => {
  it('ends the session as an explicit logout, flagged before the request', async () => {
    let flaggedAtRequest: unknown
    deleteSession.mockImplementation(() => {
      flaggedAtRequest = useState('auth:userInitiatedLogout').value
      return Promise.resolve({ status: 401 })
    })

    await useSignOut().signOut()

    expect(deleteSession).toHaveBeenCalledWith({ explicit: true })
    expect(flaggedAtRequest).toBe(true)
  })

  it('stays on a public page', async () => {
    await useSignOut().signOut()

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('leaves a signed-in-only page for the home page first', async () => {
    route.name = 'account-orders___el'

    await useSignOut().signOut()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
    expect(navigateToMock.mock.invocationCallOrder[0]!).toBeLessThan(deleteSession.mock.invocationCallOrder[0]!)
  })

  it('signs out on a route with no name too, staying put', async () => {
    route.name = undefined

    await useSignOut().signOut()

    expect(deleteSession).toHaveBeenCalledWith({ explicit: true })
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it.each([401, 410])('takes allauth\'s %i as the sign-out succeeding', async (statusCode) => {
    deleteSession.mockRejectedValue(Object.assign(new Error('Unauthorized'), { statusCode }))

    await useSignOut().signOut()

    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('puts the explicit flag back and says so when the sign-out failed', async () => {
    deleteSession.mockRejectedValue(Object.assign(new Error('Bad Gateway'), { statusCode: 502 }))

    await useSignOut().signOut()

    // Left set, it would silence a later real "session expired".
    expect(useState('auth:userInitiatedLogout').value).toBe(false)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it('reports busy while the request runs', async () => {
    let settle!: () => void
    deleteSession.mockReturnValue(new Promise((resolve) => {
      settle = () => resolve({ status: 401 })
    }))
    const { signOut, signingOut } = useSignOut()

    const done = signOut()
    await vi.waitFor(() => expect(signingOut.value).toBe(true))
    settle()
    await done

    expect(signingOut.value).toBe(false)
  })
})
