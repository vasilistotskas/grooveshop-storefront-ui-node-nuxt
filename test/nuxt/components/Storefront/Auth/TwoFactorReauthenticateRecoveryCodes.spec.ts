import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ReauthenticateRecoveryCodes from '~/components/Storefront/Auth/TwoFactorReauthenticateRecoveryCodes.vue'
import WebsideReauthenticateRecoveryCodes from '~/components/variants/webside/Storefront/Auth/TwoFactorReauthenticateRecoveryCodes.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * Confirming a security change with a recovery code (eight digits, allauth's
 * default): `useCodeReauthentication` and
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

describe.each(trees(ReauthenticateRecoveryCodes, WebsideReauthenticateRecoveryCodes))('$tree Storefront/Auth/TwoFactorReauthenticateRecoveryCodes', ({ tree, C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/2fa/reauthenticate/recovery-codes' })

  async function submit(wrapper: VueWrapper, code: string) {
    await wrapper.find('input').setValue(code)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  it('confirms with the code typed, trimmed', async () => {
    const wrapper = await mountPage()

    await submit(wrapper, '  12345678 ')

    expect(twoFaReauthenticate).toHaveBeenCalledExactlyOnceWith({ code: '12345678' })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
  })

  it('sends nothing for a code shorter than eight digits', async () => {
    const wrapper = await mountPage()

    await submit(wrapper, '1234567')

    expect(twoFaReauthenticate).not.toHaveBeenCalled()
    expect(toastAdd.mock.calls.map(([toast]) => toast.color)).toEqual(tree === 'webside' ? ['error'] : [])
  })

  it('says what allauth refused and clears the field to type again', async () => {
    twoFaReauthenticate.mockRejectedValue(WRONG_CODE)
    const wrapper = await mountPage()

    await submit(wrapper, '12345678')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.find('input').element).toHaveProperty('value', '')
  })

  it('sends a visitor nobody asked to re-authenticate home', async () => {
    useState('authEvent').value = AuthChangeEvent.LOGGED_IN

    await mountPage()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
