import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import identity from '~/middleware/identity.global'

/**
 * Every log event after a navigation carries the signed-in user's id,
 * and none after a sign-out — a stale identity would attribute the
 * next visitor's requests to the previous one on a shared device.
 */
const { user, setIdentityMock, clearIdentityMock } = vi.hoisted(() => ({
  user: { value: null as { id: number } | null },
  setIdentityMock: vi.fn(),
  clearIdentityMock: vi.fn(),
}))

mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(user.value !== null),
  user: ref(user.value),
  session: ref({}),
  ready: ref(true),
  fetch: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
}))
mockNuxtImport('setIdentity', () => setIdentityMock)
mockNuxtImport('clearIdentity', () => clearIdentityMock)

const to = { path: '/', fullPath: '/' } as RouteLocationNormalized

describe('identity.global middleware', () => {
  beforeEach(() => {
    user.value = null
  })

  it('tags the logs with the signed-in user id', () => {
    user.value = { id: 42 }

    identity(to, to)

    expect(setIdentityMock).toHaveBeenCalledWith({ userId: '42' })
    expect(clearIdentityMock).not.toHaveBeenCalled()
  })

  it('clears the identity for a guest', () => {
    identity(to, to)

    expect(clearIdentityMock).toHaveBeenCalledTimes(1)
    expect(setIdentityMock).not.toHaveBeenCalled()
  })
})
