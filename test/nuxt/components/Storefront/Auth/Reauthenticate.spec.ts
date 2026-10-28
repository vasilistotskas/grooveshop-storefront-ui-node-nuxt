import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Reauthenticate from '~/components/Storefront/Auth/Reauthenticate.vue'
import WebsideReauthenticate from '~/components/variants/webside/Storefront/Auth/Reauthenticate.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * Confirming a security change with the account password
 * (`usePasswordReauthentication` and `useAuthEventGuard`, shared by both
 * trees). The page makes sense only once the auth plugin has asked for a
 * re-authentication; anyone else goes home. Where the shopper goes after
 * confirming is the auth plugin's `auth:change` chain. Mocked at
 * `useAllAuthAuthentication`. Submitting with no password says nothing in
 * the default (its button is disabled) and toasts in the webside design.
 */
const { reauthenticate, toastAdd, navigateToMock } = vi.hoisted(() => ({
  reauthenticate: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
  navigateToMock: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ reauthenticate }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('navigateTo', () => navigateToMock)

beforeEach(() => {
  useState('authEvent').value = AuthChangeEvent.REAUTHENTICATION_REQUIRED
  reauthenticate.mockResolvedValue({ status: 200 })
})

async function submit(wrapper: VueWrapper, password: string) {
  await wrapper.find('input[autocomplete="current-password"]').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe.each(trees(Reauthenticate, WebsideReauthenticate))('$tree Storefront/Auth/Reauthenticate', ({ tree, C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/reauthenticate' })

  it('sends the password to allauth, says it is confirmed and tells its parent', async () => {
    const wrapper = await mountPage()

    await submit(wrapper, 'correct horse')

    expect(reauthenticate).toHaveBeenCalledExactlyOnceWith({ password: 'correct horse' })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('reauthenticate')).toHaveLength(1)
  })

  it('sends nothing without a password', async () => {
    const wrapper = await mountPage()

    await submit(wrapper, '')

    expect(reauthenticate).not.toHaveBeenCalled()
    expect(wrapper.emitted('reauthenticate')).toBeUndefined()
    expect(toastAdd.mock.calls).toEqual(tree === 'webside' ? [[{ title: useNuxtApp().$i18n.t('validation.required'), color: 'error' }]] : [])
  })

  it('says what allauth refused and stays', async () => {
    reauthenticate.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'incorrect_password', param: 'password', message: 'Incorrect password.' })))
    const wrapper = await mountPage()

    await submit(wrapper, 'wrong')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('reauthenticate')).toBeUndefined()
  })

  it('sends a visitor nobody asked to re-authenticate home', async () => {
    useState('authEvent').value = AuthChangeEvent.LOGGED_IN

    await mountPage()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })

  it('stays while the auth plugin has not decided yet', async () => {
    useState('authEvent').value = undefined

    await mountPage()

    expect(navigateToMock).not.toHaveBeenCalled()
  })
})
