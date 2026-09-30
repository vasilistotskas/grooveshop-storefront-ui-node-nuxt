import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import guest from '~/middleware/guest'

/**
 * The guard on the sign-in pages (login, signup, password reset, MFA
 * challenge): a visitor who is already signed in has no business there
 * and goes home; a guest passes.
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

const to = { path: '/account/login', fullPath: '/account/login' } as RouteLocationNormalized

describe('guest middleware', () => {
  beforeEach(() => {
    loggedIn.value = false
  })

  it('sends a signed-in visitor to the home page', async () => {
    loggedIn.value = true

    await guest(to, to)

    expect(navigateToMock).toHaveBeenCalledTimes(1)
    expect(useRouter().resolve(navigateToMock.mock.calls[0]![0]).name).toBe('index___el')
  })

  it('lets a guest through', async () => {
    await expect(guest(to, to)).resolves.toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
