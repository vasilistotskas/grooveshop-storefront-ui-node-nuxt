import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ReauthenticateByCode from '~/components/Storefront/Auth/ReauthenticateByCode.vue'
import WebsideReauthenticateByCode from '~/components/variants/webside/Storefront/Auth/ReauthenticateByCode.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'
import { makeUserDetails } from '~~/test/fixtures/user'
import { trees } from '~~/test/helpers/trees'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Asking for the code that confirms a security change by email
 * (`useEmailCodeReauthentication` and `useAuthEventGuard`, shared by both
 * trees): the shopper is told which address it goes to (masked), the one
 * button asks allauth for it, and the next step takes it. Mocked at
 * `useAllAuthAuthentication`.
 */
const { requestReauthenticationCode, toastAdd, routerPush, navigateToMock } = vi.hoisted(() => ({
  requestReauthenticationCode: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
  routerPush: vi.fn(() => Promise.resolve()),
  navigateToMock: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ requestReauthenticationCode }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref(makeUserDetails({ email: 'maria@example.com' })),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

beforeEach(() => {
  setTenant()
  useState('authEvent').value = AuthChangeEvent.REAUTHENTICATION_REQUIRED
  requestReauthenticationCode.mockResolvedValue({ status: 200 })
  vi.spyOn(useRouter(), 'push').mockImplementation(routerPush)
})

describe.each(trees(ReauthenticateByCode, WebsideReauthenticateByCode))('$tree Storefront/Auth/ReauthenticateByCode', ({ C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/reauthenticate/code?next=/account/settings' })

  it('names the address with most of it hidden, never the whole', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('m***@example.com')
    expect(wrapper.text()).not.toContain('maria@example.com')
  })

  it('asks allauth for a code to the shopper\'s own address, says it was sent and moves on keeping next', async () => {
    const wrapper = await mountPage()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(requestReauthenticationCode).toHaveBeenCalledExactlyOnceWith({ email: 'maria@example.com' })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
    expect(routerPush).toHaveBeenCalledExactlyOnceWith(
      useLocalePath()({ name: 'account-reauthenticate-code-confirm', query: { next: '/account/settings' } }),
    )
  })

  it('says what allauth refused and stays', async () => {
    requestReauthenticationCode.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'unknown_email', param: 'email', message: 'Unknown email.' })))
    const wrapper = await mountPage()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('sends a visitor nobody asked to re-authenticate home', async () => {
    useState('authEvent').value = AuthChangeEvent.LOGGED_IN

    await mountPage()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
