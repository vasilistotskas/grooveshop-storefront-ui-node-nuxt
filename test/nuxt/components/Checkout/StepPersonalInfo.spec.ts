import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import StepPersonalInfo from '~/components/Checkout/StepPersonalInfo.vue'
import WebsideStepPersonalInfo from '~/components/variants/webside/Checkout/StepPersonalInfo.vue'
import type { UserAddressDetail } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { makeCountry } from '~~/test/fixtures/country'
import { trees } from '~~/test/helpers/trees'

/**
 * Step 1 of checkout: who the shopper is and where the order goes.
 *
 * Prod order #316 put a postcode in the street-number field. The input
 * no longer claims `autocomplete="address-line2"` (a second street line,
 * not a house number) or a numeric keypad (numbers such as "12Α"), the
 * postcode placeholder shows the selected country's format, and Django's
 * field errors from a rejected order land under their own inputs.
 *
 * The frozen webside copy shares the logic except for one prop: the
 * default gates the ACS address chip on `acsEnabled` (a tenant without
 * an ACS contract only ever gets 503s from the proxy); webside gates it
 * on the country alone.
 */

// The phone field recognises a typed `+code` against every dial code.
// `registerEndpoint` answers the real `useApi` → `$fetch` path, so this
// file mocks neither.
const GREECE = makeCountry()
/** A country without regions: the region field reads `hasRegions`. */
const CYPRUS = makeCountry({
  alpha2: 'CY',
  alpha3: 'CYP',
  isoCc: 196,
  phoneCode: 357,
  postalCodePattern: String.raw`\d{4}`,
  postalCodeExample: '1010',
  phoneMetadata: {
    nationalNumberPattern: String.raw`[257-9]\d{7}`,
    possibleLengths: [8],
    nationalPrefixForParsing: null,
    exampleMobile: '96123456',
  },
  hasRegions: false,
  sortOrder: 2,
  translations: { el: { name: 'Κύπρος' }, en: { name: 'Cyprus' } },
})
registerEndpoint('/api/countries', () => ({ count: 2, results: [GREECE, CYPRUS] }))

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

function makeAddress(id: number): UserAddressDetail {
  return {
    id,
    title: `Διεύθυνση ${id}`,
    firstName: 'Μαρία',
    lastName: 'Παπαδοπούλου',
    street: 'Πατησίων',
    streetNumber: String(id),
    city: 'Αθήνα',
    zipcode: '10434',
    phone: '+306912345678',
    isMain: id === 1,
    user: 1,
    country: 'GR',
    region: 'GR-I',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(7, id),
  }
}

function makeFormState(overrides: Record<string, unknown> = {}) {
  return reactive<Record<string, any>>({
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
    ...overrides,
  })
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: makeFormState(),
    schema: null,
    countryOptions: [{ label: 'Ελλάδα', value: 'GR' }],
    regionOptions: [],
    mode: 'new' as const,
    postcodeExample: '151 24',
    // Boolean props: absent means `false` to Vue, and the checkout page
    // always passes both (`useCheckoutForm`). The webside copy has no
    // `acsEnabled` prop and ignores it.
    b2bInvoicingEnabled: true,
    acsEnabled: true,
    ...overrides,
  }
}

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

/** The billing fields an INVOICE collects. */
const BILLING = {
  billingVatId: '123456789',
  billingCountry: 'GR',
  billingCompanyName: 'Groove Α.Ε.',
  billingTaxOffice: 'Α Αθηνών',
  billingActivity: 'Λιανικό εμπόριο',
  billingSameAsShipping: false,
  billingStreet: 'Σταδίου',
  billingStreetNumber: '10',
  billingCity: 'Αθήνα',
  billingZipcode: '10564',
}

describe.each(trees(StepPersonalInfo, WebsideStepPersonalInfo))('$tree Checkout/StepPersonalInfo', ({ tree, C, own }) => {
  beforeEach(() => {
    session.loggedIn.value = false
  })

  const mount = (overrides: Record<string, unknown> = {}, stubs: Record<string, boolean> = {}) =>
    mountSuspended(C, { route: false, props: makeProps(overrides), global: { stubs } })

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

    it('lists the country field before street, and the region after the city', async () => {
      const wrapper = await mount({ selectedCountry: GREECE })

      const names = wrapper.findAll('[name]').map(el => el.attributes('name'))
      const country = names.indexOf('country')
      expect(country).toBeGreaterThan(-1)
      expect(country).toBeLessThan(names.indexOf('street'))
      expect(names.indexOf('city')).toBeLessThan(names.indexOf('region'))
    })

    it('passes autocomplete="country" / "address-level1" to the native selects', async () => {
      const wrapper = await mount({
        selectedCountry: GREECE,
        regionOptions: [{ label: 'Αττική', value: 'ATTIKI' }],
      })

      expect(wrapper.find('select[autocomplete="country"]').exists()).toBe(true)
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

  describe('Django\'s field errors from a rejected order', () => {
    const errors = [
      { name: 'zipcode', message: 'Εισήγαγε έγκυρο ταχυδρομικό κώδικα, π.χ. 151 24' },
      { name: 'streetNumber', message: 'Αυτό μοιάζει με ταχυδρομικό κώδικα' },
    ]

    it('renders them under their inputs when the step mounts with them', async () => {
      const wrapper = await mount({ serverErrors: errors })
      await nextTick()

      expect(wrapper.text()).toContain(errors[0]!.message)
      expect(wrapper.text()).toContain(errors[1]!.message)
    })

    it('renders errors that arrive after the step mounted', async () => {
      const wrapper = await mount()
      expect(wrapper.text()).not.toContain(errors[0]!.message)

      await wrapper.setProps({ serverErrors: errors })
      await nextTick()

      expect(wrapper.text()).toContain(errors[0]!.message)
    })
  })

  describe('phone: a country picker joined to the number', () => {
    /** The dial code UInput renders in its leading slot, in front of the digits. */
    const dialCode = (wrapper: VueWrapper) =>
      wrapper.find('input[type="tel"]').element.parentElement!.querySelector('[data-slot="leading"]')?.textContent?.trim()

    it('follows the delivery country: its flag on the picker, its code in front of the digits', async () => {
      const wrapper = await mount({
        formState: makeFormState({ country: 'CY', phoneCountry: '' }),
        countryOptions: [{ label: 'Ελλάδα', value: 'GR' }, { label: 'Κύπρος', value: 'CY' }],
      })

      await vi.waitFor(() => expect(dialCode(wrapper)).toBe('+357'))
      const picker = wrapper.findComponent({ name: 'USelectMenu' })
      expect(picker.find('button').attributes('aria-label')).toBe('Κωδικός χώρας τηλεφώνου: Κύπρος (+357)')
      const phone = wrapper.find('input[type="tel"]')
      expect(phone.attributes('autocomplete')).toBe('tel')
      expect(phone.attributes('placeholder')).toBe('96123456')
      // The contract is "padding sized to the code, never an overlay on
      // the digits" — the padding utility is how it is sized.
      expect(phone.classes()).toContain('ps-(--dial-code-length)')
    })

    it('a Greek number can stay +30 while delivering to Cyprus', async () => {
      const wrapper = await mount({
        formState: makeFormState({ country: 'CY', phoneCountry: 'GR' }),
        countryOptions: [{ label: 'Κύπρος', value: 'CY' }],
      })

      await vi.waitFor(() => expect(dialCode(wrapper)).toBe('+30'))
      expect(wrapper.find('input[type="tel"]').attributes('placeholder')).toBe('6912345678')
    })

    it('has no recognised-country badge or hint', async () => {
      const wrapper = await mount({ formState: makeFormState({ country: 'CY', phone: '+35796123456' }) })

      await vi.waitFor(() => expect(dialCode(wrapper)).toBe('+357'))
      expect(wrapper.text()).not.toContain('Αναγνωρίστηκε')
      expect(wrapper.text()).not.toContain('ξεκινήστε')
    })
  })

  describe('invoice (Τιμολόγιο) instead of a receipt', () => {
    const invoiceLabel = () => t('form.invoice.toggle_label')

    it('asks for the company details once the shopper ticks the invoice box', async () => {
      const formState = makeFormState()
      const wrapper = await mount({ formState })
      expect(hasField(wrapper, 'billingVatId')).toBe(false)

      await checkbox(wrapper, invoiceLabel()).trigger('click')

      expect(formState.documentType).toBe('INVOICE')
      for (const name of ['billingCompanyName', 'billingVatId', 'billingTaxOffice', 'billingActivity']) {
        expect(hasField(wrapper, name)).toBe(true)
      }
    })

    it('asks for a billing address only when it differs from the delivery one', async () => {
      const formState = makeFormState({ documentType: 'INVOICE', billingSameAsShipping: true })
      const wrapper = await mount({ formState })
      expect(hasField(wrapper, 'billingStreet')).toBe(false)

      await checkbox(wrapper, t('form.invoice.billing_same_label')).trigger('click')

      expect(formState.billingSameAsShipping).toBe(false)
      expect(hasField(wrapper, 'billingStreet')).toBe(true)
    })

    it('wipes every billing field when the shopper goes back to a receipt', async () => {
      // A VAT id left behind would still reach Django and myDATA would
      // issue an invoice (type 1.1) to a company the shopper un-picked.
      const formState = makeFormState({ documentType: 'INVOICE', ...BILLING })
      const wrapper = await mount({ formState })

      await checkbox(wrapper, invoiceLabel()).trigger('click')

      expect(formState).toMatchObject({
        documentType: 'RECEIPT',
        billingVatId: '',
        billingCountry: '',
        billingCompanyName: '',
        billingTaxOffice: '',
        billingActivity: '',
        billingSameAsShipping: true,
        billingStreet: '',
        billingStreetNumber: '',
        billingCity: '',
        billingZipcode: '',
      })
    })

    it('offers no invoice at all when the store turned B2B invoicing off', async () => {
      const wrapper = await mount({ b2bInvoicingEnabled: false })

      expect(wrapper.text()).not.toContain(invoiceLabel())
    })
  })

  describe('saved addresses', () => {
    const saved = { savedAddresses: [makeAddress(1), makeAddress(2)], selectedSavedAddressId: 1 }

    it('lists the shopper\'s addresses above the form and reports a pick', async () => {
      const wrapper = await mount({ ...saved, mode: 'new' })

      await wrapper.find('[role="radio"][value="2"]').trigger('click')

      expect(wrapper.emitted('select-saved-address')).toEqual([[2]])
    })

    it('reports the "new address" card', async () => {
      const wrapper = await mount({ ...saved, mode: 'saved' })

      await wrapper.find('[role="radio"][value="__new__"]').trigger('click')

      expect(wrapper.emitted('use-new-address')).toHaveLength(1)
    })

    it('hides the personal and address inputs while a saved address is picked', async () => {
      const wrapper = await mount({ ...saved, mode: 'saved' })

      expect(hasField(wrapper, 'firstName')).toBe(false)
      expect(hasField(wrapper, 'street')).toBe(false)
      // Order notes are about the order, not the address.
      expect(hasField(wrapper, 'customerNotes')).toBe(true)
    })

    it('shows no address picker to a shopper without saved addresses', async () => {
      const wrapper = await mount()

      expect(wrapper.findComponent({ name: own('CheckoutSavedAddresses') }).exists()).toBe(false)
      expect(hasField(wrapper, 'firstName')).toBe(true)
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
      const wrapper = await mount({ savedAddresses: [makeAddress(1)], selectedSavedAddressId: 1, mode: 'saved' })

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

    it('honours the store\'s ACS contract; the frozen copy gates on the country alone', async () => {
      // Webside predates the `acsEnabled` prop, so it still asks the
      // proxy for a store without ACS — which answers 503.
      const enabled = await chipEnabled({ formState: makeFormState({ country: 'GR' }), acsEnabled: false })

      expect(enabled).toBe(tree === 'webside')
    })
  })

  it('submits through the exposed submit() the sidebar CTA calls', async () => {
    const wrapper = await mount()

    await (wrapper.vm as unknown as { $: { exposed: { submit: () => Promise<void> } } }).$.exposed.submit()
    await vi.waitFor(() => expect(wrapper.emitted('next')).toHaveLength(1))
  })
})
