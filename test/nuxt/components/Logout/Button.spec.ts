import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import LogoutButton from '~/components/Logout/Button.vue'

/**
 * Signing out. The button leaves a protected page first, marks the
 * logout as the shopper's own BEFORE the request (so a racing 410 does
 * not raise a "session expired" toast), and leaves the rest to the
 * auth plugin's LOGGED_OUT cascade.
 */
const { deleteSession, navigateToMock, route } = vi.hoisted(() => ({
  deleteSession: vi.fn((_opts: unknown) => Promise.resolve({ status: 401 })),
  navigateToMock: vi.fn(),
  route: { name: 'index___el' as string | undefined, path: '/', fullPath: '/', params: {}, query: {}, hash: '', meta: {}, matched: [] },
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ deleteSession }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useRoute', () => () => route)

beforeEach(() => {
  route.name = 'index___el'
  useState('auth:userInitiatedLogout').value = false
})

async function clickLogout() {
  const wrapper = await mountSuspended(LogoutButton, { route: false })
  await wrapper.find('button').trigger('click')
  await flushPromises()
  return wrapper
}

describe('Logout/Button', () => {
  it('ends the session as an explicit logout, flagged before the request', async () => {
    let flaggedAtRequest: unknown
    deleteSession.mockImplementation(() => {
      flaggedAtRequest = useState('auth:userInitiatedLogout').value
      return Promise.resolve({ status: 401 })
    })

    await clickLogout()

    expect(deleteSession).toHaveBeenCalledWith({ explicit: true })
    expect(flaggedAtRequest).toBe(true)
  })

  it('stays on a public page', async () => {
    await clickLogout()

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('leaves a signed-in-only page for the home page first', async () => {
    route.name = 'account-orders___el'

    await clickLogout()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
    expect(navigateToMock.mock.invocationCallOrder[0]!).toBeLessThan(deleteSession.mock.invocationCallOrder[0]!)
  })

  it('does nothing on a route with no name', async () => {
    route.name = undefined

    await clickLogout()

    expect(deleteSession).not.toHaveBeenCalled()
  })
})
