import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Signup from '~/components/Storefront/Auth/Signup.vue'
import WebsideSignup from '~/components/variants/webside/Storefront/Auth/Signup.vue'
import { createLoyaltySettingsMock } from '~~/test/helpers/loyaltySettings'
import { makeLoyaltySettings } from '~~/test/fixtures/loyalty'
import { setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The sign-up page promises a welcome bonus only where the store gives one:
 * the loyalty feature on AND the new-customer bonus on in its settings. Both
 * designs say so in their own words; the form itself is not under test here.
 */
const settings = createLoyaltySettingsMock()
mockNuxtImport('useLoyaltySettings', () => () => settings.use)

/** Each tree's own `<i18n>` copy (el): the bonus line. */
const COPY = {
  default: {
    bonus: 'η πρώτη σου παραγγελία κερδίζει μπόνους καλωσορίσματος',
  },
  webside: {
    bonus: 'Η πρώτη σου παραγγελία κερδίζει μπόνους καλωσορίσματος.',
  },
} as const

beforeEach(() => {
  settings.reset()
  setTenantFeatures({ loyalty: true })
  settings.data.value = makeLoyaltySettings({ newCustomerBonusEnabled: true })
})

describe.each(trees(Signup, WebsideSignup))('$tree Storefront/Auth/Signup', ({ tree, C }) => {
  const copy = COPY[tree]

  const mountPage = async () => {
    const wrapper = await mountSuspended(C, {
      route: false,
      global: { stubs: { AccountSignupForm: true, WebsideAccountSignupForm: true } },
    })
    await flushPromises()
    return wrapper
  }

  it('promises the welcome bonus when the store gives one', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(copy.bonus)
  })

  it.each([
    ['has the new-customer bonus off', () => { settings.data.value = makeLoyaltySettings({ newCustomerBonusEnabled: false }) }],
    ['has the loyalty feature off', () => { setTenantFeatures({ loyalty: false }) }],
    ['has settings that cannot be read', () => { settings.data.value = null }],
  ])('promises no bonus when the store %s', async (_name, arrange) => {
    arrange()

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain(copy.bonus)
  })

  // The platform's page words its lead either way; webside's adds a line or nothing.
  it.runIf(tree === 'default')('says the plain lead when there is no bonus', async () => {
    settings.data.value = makeLoyaltySettings({ newCustomerBonusEnabled: false })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Δωρεάν, και θέλει ένα λεπτό.')
  })
})
