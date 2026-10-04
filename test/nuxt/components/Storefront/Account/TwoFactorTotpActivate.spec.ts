import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import TwoFactorTotpActivate from '~/components/Storefront/Account/TwoFactorTotpActivate.vue'

/**
 * The page body around the activation form: the page's one heading, and
 * nothing of the old settings sidebar (the account shell draws the
 * navigation). The form itself is covered by its own spec.
 */
const { totpAuthenticatorStatus } = vi.hoisted(() => ({
  totpAuthenticatorStatus: vi.fn(() => Promise.resolve({ status: 404, meta: { secret: 'JBSWY3DPEHPK3PXP', totp_svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>' } })),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ totpAuthenticatorStatus, activateTotp: vi.fn() }))

describe('Storefront/Account/TwoFactorTotpActivate', () => {
  it('heads the page and renders the activation steps without a sidebar', async () => {
    clearNuxtData('totpAuthenticatorStatus')
    const wrapper = await mountSuspended(TwoFactorTotpActivate, { route: false })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Ενεργοποίηση επαλήθευσης δύο βημάτων')
    expect(wrapper.findAll('ol > li')).toHaveLength(2)
    expect(wrapper.find('aside').exists()).toBe(false)
  })
})
