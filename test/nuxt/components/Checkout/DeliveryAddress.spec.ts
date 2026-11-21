import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { UForm } from '#components'
import DeliveryAddress from '~/components/Checkout/DeliveryAddress.vue'
import WebsideDeliveryAddress from '~/components/variants/webside/Checkout/DeliveryAddress.vue'
import { makeCountry } from '~~/test/fixtures/country'
import { trees } from '~~/test/helpers/trees'

/**
 * The address a home delivery goes to, on the delivery step (#767: a
 * pickup order is delivered to the point and asks for none of it).
 *
 * Prod order #316 put a postcode in the street-number field. The input
 * no longer claims `autocomplete="address-line2"` (a second street line,
 * not a house number) or a numeric keypad (numbers such as "12Α"), and
 * the postcode placeholder shows the selected country's format. Both
 * trees gate the ACS address chip on Greece and on `acsEnabled` (a
 * tenant without an ACS contract only ever gets 503s from the proxy).
 */

const GREECE = makeCountry()
/** A country without regions: the region field reads `hasRegions`. */
const CYPRUS = makeCountry({
  alpha2: 'CY',
  alpha3: 'CYP',
  isoCc: 196,
  phoneCode: 357,
  postalCodePattern: String.raw`\d{4}`,
  postalCodeExample: '1010',
  hasRegions: false,
  sortOrder: 2,
  translations: { el: { name: 'Κύπρος' }, en: { name: 'Cyprus' } },
})

// The bootstrap plugin chain calls useUserSession too, so the mock
// carries its whole surface.
const session = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { loggedIn: ref(false), user: ref<unknown>(null), session: ref({}), ready: ref(true) }
})
mockNuxtImport('useUserSession', () => () => ({
  ...session,
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const t = (key: string, params: Record<string, unknown> = {}): string => useNuxtApp().$i18n.t(key, params)

/** A checkbox by its visible label (UCheckbox: `<label for>` → `role="checkbox"` button). */
function checkbox(wrapper: VueWrapper, label: string) {
  const labelEl = wrapper.findAll('label').find(l => l.text() === label)
  if (!labelEl) throw new Error(`no checkbox "${label}"`)
  return wrapper.find(`[role="checkbox"][id="${labelEl.attributes('for')}"]`)
}

function hasField(wrapper: VueWrapper, name: string): boolean {
  return wrapper.find(`[name="${name}"]`).exists()
}

function makeFormState(overrides: Record<string, unknown> = {}) {
  return reactive<Record<string, any>>({
    street: '',
    streetNumber: '',
    zipcode: '',
    city: '',
    region: '',
    country: 'GR',
    ...overrides,
  })
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: makeFormState(),
    regionOptions: [],
    mode: 'new' as const,
    postcodeExample: '151 24',
    acsEnabled: true,
    ...overrides,
  }
}

describe.each(trees(DeliveryAddress, WebsideDeliveryAddress))('$tree Checkout/DeliveryAddress', ({ tree, C, own }) => {
  beforeEach(() => {
    session.loggedIn.value = false
  })

  // Inside a form, as the delivery step renders it: a select draws its
  // native control (the one autofill reads) only within one.
  const mount = (overrides: Record<string, unknown> = {}, stubs: Record<string, boolean> = {}) => {
    const props = makeProps(overrides)
    const InStep = defineComponent({
      setup: () => () => h(UForm, { state: props.formState }, { default: () => h(C, props) }),
    })
    return mountSuspended(InStep, { route: false, global: { stubs } })
  }

  describe('address fields', () => {
    it('the street-number input is neither an address line nor a keypad', async () => {
      const wrapper = await mount()

      const streetNumber = wrapper.find(`input[placeholder="${t('form.street_number_placeholder')}"]`)
      // UInput's own default, not an address token.
      expect(streetNumber.attributes('autocomplete')).toBe('off')
      expect(streetNumber.attributes('inputmode')).toBeUndefined()
    })

    it('shows the selected country\'s postcode example as the placeholder', async () => {
      const wrapper = await mount()

      const zipcode = wrapper.find('input[autocomplete="postal-code"]')
      expect(zipcode.attributes('placeholder')).toBe(t('form.zipcode_placeholder', { example: '151 24' }))
    })

    it('lists the street first and the region after the city', async () => {
      const wrapper = await mount({ selectedCountry: GREECE })

      const names = wrapper.findAll('[name]').map(el => el.attributes('name'))
      expect(names[0]).toBe('street')
      expect(names.indexOf('city')).toBeLessThan(names.indexOf('region'))
    })

    it('passes autocomplete="address-level1" to the native region select', async () => {
      const wrapper = await mount({
        selectedCountry: GREECE,
        regionOptions: [{ label: 'Αττική', value: 'ATTIKI' }],
      })

      expect(wrapper.find('select[autocomplete="address-level1"]').exists()).toBe(true)
    })
  })

  describe('region field follows Country.hasRegions', () => {
    it('renders enabled for a country with regions (GR)', async () => {
      const wrapper = await mount({
        selectedCountry: GREECE,
        regionOptions: [{ label: 'Αττική', value: 'ATTIKI' }],
      })

      const regionLabel = wrapper.findAll('label').find(l => l.text() === t('form.region'))
      const regionSelect = wrapper.find(`[role="combobox"]#${regionLabel!.attributes('for')}`)
      expect(regionSelect.exists()).toBe(true)
      expect(regionSelect.attributes('disabled')).toBeUndefined()
    })

    it('is disabled while the regions have not loaded', async () => {
      const wrapper = await mount({ selectedCountry: GREECE, regionOptions: [] })

      const regionLabel = wrapper.findAll('label').find(l => l.text() === t('form.region'))
      expect(wrapper.find(`[role="combobox"]#${regionLabel!.attributes('for')}`).attributes()).toHaveProperty('disabled')
    })

    it('is not rendered at all for a country without regions', async () => {
      const wrapper = await mount({ selectedCountry: CYPRUS })

      expect(hasField(wrapper, 'region')).toBe(false)
    })
  })

  describe('the layout (default tree)', () => {
    it.runIf(tree === 'default')('keeps the postcode, city and region on one row, and the postcode and city alone for a country without regions', async () => {
      const withRegions = await mount({ selectedCountry: GREECE, regionOptions: [{ label: 'Αττική', value: 'ATTIKI' }] })
      const zip = (w: VueWrapper) => w.find('input[autocomplete="postal-code"]').element.closest('[class*="md:grid-cols"]')!.className
      expect(zip(withRegions)).toContain('md:grid-cols-3')

      const without = await mount({ selectedCountry: CYPRUS })
      expect(zip(without)).toContain('md:grid-cols-2')
    })

    it.runIf(tree === 'default')('puts the ACS suggestion between the street and the postcode', async () => {
      const wrapper = await mount({ formState: makeFormState({ country: 'GR' }) }, { CheckoutAcsAddressSuggestion: true })
      const order = wrapper.findAll('[name="street"], checkout-acs-address-suggestion-stub, [name="zipcode"]').map(el => el.attributes('name') ?? 'acs')

      expect(order).toEqual(['street', 'acs', 'zipcode'])
    })
  })

  describe('saving the typed address to the address book', () => {
    // The component's own <i18n> block, which the app-level `t` cannot see.
    const saveLabel = () => 'Αποθήκευση της διεύθυνσης στον λογαριασμό μου'

    it('is offered to a signed-in shopper typing a new address, with a name field once ticked', async () => {
      session.loggedIn.value = true
      const formState = makeFormState()
      const wrapper = await mount({ formState })

      await checkbox(wrapper, saveLabel()).trigger('click')

      expect(formState.saveAddress).toBe(true)
      expect(hasField(wrapper, 'addressTitle')).toBe(true)
    })

    it('is not offered to a guest, who has no address book', async () => {
      const wrapper = await mount()

      expect(wrapper.text()).not.toContain(saveLabel())
    })

    it('is not offered for an address that is already saved', async () => {
      session.loggedIn.value = true
      const wrapper = await mount({ mode: 'saved' })

      expect(wrapper.text()).not.toContain(saveLabel())
    })
  })

  describe('the ACS address suggestion', () => {
    const chipEnabled = async (overrides: Record<string, unknown>) => {
      const wrapper = await mount(overrides, { [own('CheckoutAcsAddressSuggestion')]: true })
      return wrapper.findComponent({ name: own('CheckoutAcsAddressSuggestion') }).props('enabled')
    }

    it('runs for a Greek address', async () => {
      expect(await chipEnabled({ formState: makeFormState({ country: 'GR' }) })).toBe(true)
    })

    it('stays off outside Greece, which ACS does not serve', async () => {
      expect(await chipEnabled({ formState: makeFormState({ country: 'CY' }) })).toBe(false)
    })

    it('stays off for a store without an ACS contract, whose proxy only answers 503', async () => {
      expect(await chipEnabled({ formState: makeFormState({ country: 'GR' }), acsEnabled: false })).toBe(false)
    })
  })
})
