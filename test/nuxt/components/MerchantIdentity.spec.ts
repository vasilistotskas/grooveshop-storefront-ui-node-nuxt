import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import MerchantIdentity from '~/components/MerchantIdentity.vue'

/**
 * A storefront has to say who is selling it to you.
 *
 * - e-Commerce Directive 2000/31/EC art. 5(1): name, geographic address
 *   of establishment, contact details, trade register + registration
 *   number, and VAT number.
 * - N. 4919/2022 art. 22 §3: the GEMI number on the e-shop.
 * - N. 4919/2022 art. 22 §4: legal form, name, registered seat and
 *   liquidation status "σε εμφανές σημείο". €200-500 under art. 50(γ).
 *
 * So every field the merchant published must actually RENDER — the
 * earlier source check passed on the word `email` appearing anywhere in
 * the file. What counts as publishable (a name alone does not) is
 * `test/nuxt/composables/useMerchantIdentity.spec.ts`; that both footers
 * mount this block is `test/unit/source-rules/merchant-identity.spec.ts`.
 *
 * The register labels are asserted verbatim: ΓΕΜΗ and ΑΦΜ are the names
 * of the Greek registers, which is the point of printing them.
 */
const EMPTY = {
  name: '',
  legalForm: '',
  vatId: '',
  taxOffice: '',
  registrationNumber: '',
  businessActivity: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: '',
  phone: '',
  email: '',
  inLiquidation: false,
  missingFields: [],
  isComplete: false,
}

const PUBLISHED = {
  ...EMPTY,
  name: 'Acme',
  legalForm: 'ΙΚΕ',
  vatId: '801234567',
  registrationNumber: '123456701000',
  addressLine1: 'Ερμού 1',
  postalCode: '10563',
  city: 'Αθήνα',
  country: 'GR',
  phone: '+302101234567',
  email: 'info@acme.test',
}

let identity: Record<string, unknown> = EMPTY
let served = 0

registerEndpoint('/api/tenant/legal-identity', () => {
  served++
  return identity
})

async function mountIdentity(payload: Record<string, unknown>) {
  identity = payload
  const wrapper = await mountSuspended(MerchantIdentity, { route: false })
  await vi.waitFor(() => expect(served).toBe(1))
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  served = 0
  clearNuxtData('tenant-legal-identity')
})

describe('MerchantIdentity', () => {
  it('publishes every field the merchant filled in, as an address', async () => {
    const wrapper = await mountIdentity(PUBLISHED)

    const address = wrapper.find('address')
    expect(address.exists()).toBe(true)
    const text = address.text().replace(/\s+/g, ' ')
    expect(text).toContain('Acme ΙΚΕ')
    expect(text).toContain('Ερμού 1, 10563 Αθήνα, GR')
    expect(text).toContain('ΓΕΜΗ: 123456701000')
    expect(text).toContain('ΑΦΜ: 801234567')
    expect(address.find('a[href="tel:+302101234567"]').text()).toBe('+302101234567')
    expect(address.find('a[href="mailto:info@acme.test"]').text()).toBe('info@acme.test')
    expect(text).not.toContain('Υπό εκκαθάριση')
  })

  it('discloses a liquidation', async () => {
    const wrapper = await mountIdentity({ ...PUBLISHED, inLiquidation: true })

    expect(wrapper.find('address').text()).toContain('Υπό εκκαθάριση')
  })

  it('leaves out the rows the merchant did not fill in', async () => {
    const wrapper = await mountIdentity({ ...EMPTY, name: 'Acme', vatId: '801234567' })

    const address = wrapper.find('address')
    expect(address.text()).toContain('ΑΦΜ: 801234567')
    expect(address.text()).not.toContain('ΓΕΜΗ')
    expect(address.find('a').exists()).toBe(false)
  })

  it('renders nothing for a store that has published nothing to disclose', async () => {
    // A heading over blank rows is not more compliant than silence.
    const wrapper = await mountIdentity({ ...EMPTY, name: 'Acme' })

    expect(wrapper.find('address').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
