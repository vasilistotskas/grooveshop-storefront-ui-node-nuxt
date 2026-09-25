/**
 * Tests for the frozen webside Checkout/StepPersonalInfo.vue — the address fields.
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
import StepPersonalInfo from '~/components/variants/webside/Checkout/StepPersonalInfo.vue'

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

describe('webside Checkout/StepPersonalInfo address fields', () => {
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
})
