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
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StepPersonalInfo from '~/components/Checkout/StepPersonalInfo.vue'

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

  describe('phone dial-code badge follows the selected country', () => {
    it('shows +30 for Greece', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({ selectedCountry: { alpha2: 'GR', phoneCode: 30 } }),
      })

      expect(wrapper.html()).toContain('+30')
    })

    it('shows +357 for Cyprus', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({ selectedCountry: { alpha2: 'CY', phoneCode: 357 } }),
      })

      expect(wrapper.html()).toContain('+357')
    })

    it('renders no badge when no country is selected yet', async () => {
      const wrapper = await mountSuspended(StepPersonalInfo, {
        props: makeProps({ selectedCountry: null }),
      })

      expect(wrapper.html()).not.toContain('+30')
      expect(wrapper.html()).not.toContain('+357')
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
