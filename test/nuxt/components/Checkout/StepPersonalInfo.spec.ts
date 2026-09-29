/**
 * Tests for Checkout/StepPersonalInfo.vue — the address fields.
 *
 * Prod order #316 put a postcode in the street-number field. The input
 * no longer claims ``autocomplete="address-line2"`` (a second street
 * line, not a house number — there is no house-number autofill token)
 * or a numeric keypad (numbers such as "12Α"), the postcode placeholder
 * shows the selected country's format, and Django's field errors from a
 * rejected order land under their own inputs via ``UForm.setErrors``.
 */

import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import StepPersonalInfo from '~/components/Checkout/StepPersonalInfo.vue'

// The phone field recognises a typed `+code` against every dial code.
registerEndpoint('/api/countries', () => ({
  count: 2,
  results: [30, 357].map(phoneCode => ({
    alpha2: phoneCode === 30 ? 'GR' : 'CY',
    phoneCode,
    translations: { el: { name: phoneCode === 30 ? 'Ελλάδα' : 'Κύπρος' } },
    phoneMetadata: {
      nationalNumberPattern: '\d+',
      possibleLengths: [8, 10],
      nationalPrefixForParsing: null,
      exampleMobile: phoneCode === 30 ? '6912345678' : '96123456',
    },
  })),
}))

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      street: '',
      streetNumber: '',
      zipcode: '',
      city: '',
      region: '',
      country: '',
      documentType: 'RECEIPT',
      billingSameAsShipping: true,
    },
    schema: null,
    countryOptions: [{ label: 'Ελλάδα', value: 'GR' }],
    regionOptions: [],
    mode: 'new' as const,
    postcodeExample: '151 24',
    ...overrides,
  }
}

describe('Checkout/StepPersonalInfo address fields', () => {
  it('the street-number input is neither an address line nor a keypad', async () => {
    const wrapper = await mountSuspended(StepPersonalInfo, { props: makeProps() })

    const streetNumber = wrapper.find('input[placeholder="π.χ. 12"]')
    expect(streetNumber.exists()).toBe(true)
    // UInput's own default, not an address token.
    expect(streetNumber.attributes('autocomplete')).toBe('off')
    expect(streetNumber.attributes('inputmode')).toBeUndefined()
  })

  it('shows the selected country\'s postcode example as the placeholder', async () => {
    const wrapper = await mountSuspended(StepPersonalInfo, { props: makeProps() })

    const zipcode = wrapper.find('input[autocomplete="postal-code"]')
    expect(zipcode.attributes('placeholder')).toBe('π.χ. 151 24')
  })

  it('renders Django\'s field errors under their inputs', async () => {
    const wrapper = await mountSuspended(StepPersonalInfo, {
      props: makeProps({
        serverErrors: [
          { name: 'zipcode', message: 'Εισήγαγε έγκυρο ταχυδρομικό κώδικα, π.χ. 151 24' },
          { name: 'streetNumber', message: 'Αυτό μοιάζει με ταχυδρομικό κώδικα' },
        ],
      }),
    })
    await nextTick()

    const html = wrapper.html()
    expect(html).toContain('Εισήγαγε έγκυρο ταχυδρομικό κώδικα, π.χ. 151 24')
    expect(html).toContain('Αυτό μοιάζει με ταχυδρομικό κώδικα')
  })

  describe('phone is ONE field, read against the delivery country', () => {
    it('is a single tel input with autocomplete="tel" and no dial-code overlay', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({ formState: { ...makeProps().formState, country: 'CY', phone: '' } }),
      })

      await flushPromises()
      const phone = wrapper.find('input[type="tel"]')
      expect(phone.exists()).toBe(true)
      expect(phone.attributes('autocomplete')).toBe('tel')
      expect(phone.attributes('placeholder')).toBe('96123456')
      // No sticky `+357` in front of the digits any more.
      expect(wrapper.find('input[type="tel"]').classes()).not.toContain('ps-11')
      expect(wrapper.html()).not.toContain('+357')
    })

    it('badges the country a typed number resolves to (inside the field)', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({ formState: { ...makeProps().formState, country: 'CY', phone: '+306912345678' } }),
      })

      await flushPromises()
      expect(wrapper.text()).toContain('+30')
      expect(wrapper.find('input[type="tel"]').classes()).toContain('pe-28')
    })
  })

  describe('country comes first, with autofill tokens on the selects', () => {
    it('lists the country field before street, and the region after the city', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({ selectedCountry: { alpha2: 'GR', hasRegions: true } }),
      })

      const names = wrapper.findAll('[name]').map(el => el.attributes('name'))
      const country = names.indexOf('country')
      expect(country).toBeGreaterThan(-1)
      expect(country).toBeLessThan(names.indexOf('street'))
      expect(names.indexOf('city')).toBeLessThan(names.indexOf('region'))
    })

    it('passes autocomplete="country" / "address-level1" to the native selects', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({
          selectedCountry: { alpha2: 'GR', hasRegions: true },
          regionOptions: [{ label: 'Αττική', value: 'ATTIKI' }],
        }),
      })

      expect(wrapper.find('select[autocomplete="country"]').exists()).toBe(true)
      expect(wrapper.find('select[autocomplete="address-level1"]').exists()).toBe(true)
    })
  })

  describe('region field follows Country.hasRegions', () => {
    it('renders (required, enabled) for a country with regions (GR)', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({
          selectedCountry: { alpha2: 'GR', hasRegions: true },
          regionOptions: [{ label: 'Αττική', value: 'ATTIKI' }],
        }),
      })

      const regionLabel = wrapper.findAll('label').find(l => l.text() === 'Περιφέρεια')
      expect(regionLabel).toBeDefined()
      expect(regionLabel?.classes().join(' ')).toContain('after:content-[\'*\']')
      const regionSelect = wrapper.find('[role="combobox"]#' + regionLabel?.attributes('for'))
      expect(regionSelect.attributes('disabled')).toBeUndefined()
    })

    it('is not rendered at all for a country without regions', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({
          selectedCountry: { alpha2: 'XX', hasRegions: false },
          regionOptions: [],
        }),
      })

      const regionLabel = wrapper.findAll('label').find(l => l.text() === 'Περιφέρεια')
      expect(regionLabel).toBeUndefined()
    })
  })
})
