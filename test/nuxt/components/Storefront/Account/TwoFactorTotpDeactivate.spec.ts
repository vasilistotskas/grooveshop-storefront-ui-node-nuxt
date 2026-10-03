import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import TwoFactorTotpDeactivate from '~/components/Storefront/Account/TwoFactorTotpDeactivate.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'

/**
 * Turning TOTP off: a card saying what it means, a confirmation tick that
 * unlocks the destructive button, Cancel back to the security page.
 * Mocked at `useAllAuthAccount`.
 */
const { totpAuthenticatorStatus, deactivateTotp, navigateToMock, toastAdd } = vi.hoisted(() => ({
  totpAuthenticatorStatus: vi.fn(),
  deactivateTotp: vi.fn(() => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ totpAuthenticatorStatus, deactivateTotp }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

beforeEach(() => {
  clearNuxtData('totpAuthenticatorStatus')
  totpAuthenticatorStatus.mockResolvedValue({ status: 200, data: { type: 'totp' } })
})

async function mountBody() {
  const wrapper = await mountSuspended(TwoFactorTotpDeactivate, { route: false })
  await flushPromises()
  return wrapper
}

const turnOff = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find(button => button.text() === 'Απενεργοποίηση')!

describe('Storefront/Account/TwoFactorTotpDeactivate', () => {
  it('keeps Turn off locked until the shopper confirms the risks', async () => {
    const wrapper = await mountBody()
    expect(turnOff(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('button[role="checkbox"]').trigger('click')

    expect(turnOff(wrapper).attributes('disabled')).toBeUndefined()
    expect(deactivateTotp).not.toHaveBeenCalled()
  })

  it('turns TOTP off, tells the shopper and returns to the settings', async () => {
    const wrapper = await mountBody()
    await wrapper.find('button[role="checkbox"]').trigger('click')

    await turnOff(wrapper).trigger('click')
    await flushPromises()

    expect(deactivateTotp).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success', description: 'Η εφαρμογή ελέγχου ταυτότητας απενεργοποιήθηκε επιτυχώς' }))
    expect(wrapper.emitted('deactivateTotp')).toHaveLength(1)
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-security'))
  })

  it('stays on the page when allauth refuses', async () => {
    deactivateTotp.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'reauthentication_required', param: 'password', message: 'Reauthentication required.' })))
    const wrapper = await mountBody()
    await wrapper.find('button[role="checkbox"]').trigger('click')

    await turnOff(wrapper).trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('deactivateTotp')).toBeUndefined()
  })

  it('offers Cancel as a link back to the security page', async () => {
    const wrapper = await mountBody()

    const cancel = wrapper.findAll('a').find(link => link.text() === 'Ακύρωση')!
    expect(cancel.attributes('href')).toBe(useLocalePath()('account-security'))
  })

  it('sends the shopper back to the settings when the status cannot be read', async () => {
    totpAuthenticatorStatus.mockRejectedValue(new Error('Bad Gateway'))

    await mountBody()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-security'))
  })
})
