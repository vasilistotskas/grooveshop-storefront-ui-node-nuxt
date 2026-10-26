import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ReauthenticateTotp from '~/components/Storefront/Auth/TwoFactorReauthenticateTotp.vue'
import WebsideReauthenticateTotp from '~/components/variants/webside/Storefront/Auth/TwoFactorReauthenticateTotp.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * Confirming a security change with a code from the authenticator app (six
 * digits): `useCodeReauthentication` and
 * `useAuthEventGuard`, shared by both trees. A refused code is cleared so
 * the shopper types it again; where the shopper goes after confirming is
 * the auth plugin's `auth:change` chain. The frozen tree says a code is
 * too short in a toast where the default just waits. Mocked at
 * `useAllAuthAuthentication`.
 */

const { twoFaReauthenticate, toastAdd, navigateToMock } = vi.hoisted(() => ({
  twoFaReauthenticate: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
  navigateToMock: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ twoFaReauthenticate }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('navigateTo', () => navigateToMock)

const WRONG_CODE = asProxiedError(makeBadResponse({ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' }))

beforeEach(() => {
  useState('authEvent').value = AuthChangeEvent.REAUTHENTICATION_REQUIRED
  twoFaReauthenticate.mockResolvedValue({ status: 200 })
})

describe.each(trees(ReauthenticateTotp, WebsideReauthenticateTotp))('$tree Storefront/Auth/TwoFactorReauthenticateTotp', ({ tree, C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/2fa/reauthenticate/totp' })
  const pins = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'UPinInput' })

  it('confirms with the six digits as the last one lands', async () => {
    const wrapper = await mountPage()

    await pins(wrapper).setValue(['1', '2', '3', '4', '5', '6'])
    await flushPromises()

    expect(twoFaReauthenticate).toHaveBeenCalledExactlyOnceWith({ code: '123456' })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
  })

  it('sends nothing until all six digits are in', async () => {
    const wrapper = await mountPage()

    await pins(wrapper).setValue(['1', '2', '3'])
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(twoFaReauthenticate).not.toHaveBeenCalled()
    expect(toastAdd.mock.calls.map(([toast]) => toast.color)).toEqual(tree === 'webside' ? ['error'] : [])
  })

  it('says what allauth refused and clears the digits to type again', async () => {
    twoFaReauthenticate.mockRejectedValue(WRONG_CODE)
    const wrapper = await mountPage()

    await pins(wrapper).setValue(['9', '8', '7', '6', '5', '4'])
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(pins(wrapper).props('modelValue')).toEqual([])
  })

  it('sends a visitor nobody asked to re-authenticate home', async () => {
    useState('authEvent').value = AuthChangeEvent.LOGGED_IN

    await mountPage()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
