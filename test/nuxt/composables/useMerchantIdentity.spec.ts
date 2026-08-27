import { describe, expect, it } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'

/**
 * Behaviour of the published seller identity, driven through the real
 * endpoint rather than asserted against source strings.
 *
 * The case that matters is the half-filled one. `INVOICE_SELLER_NAME`
 * is populated on stores that have done nothing about disclosure — it
 * is filled in for invoicing — so "has a name" is NOT the same as "has
 * something to publish". Production carried exactly a name and nothing
 * else, which under the first version of this composable would have put
 * a lone company name in an <address> block: no legal form, no seat, no
 * GEMI, no VAT id. That discloses nothing a shopper cannot read off the
 * site and looks like a bug.
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

let payload: Record<string, unknown> = { ...EMPTY }

registerEndpoint('/api/tenant/legal-identity', () => payload)

async function load(overrides: Record<string, unknown>) {
  payload = { ...EMPTY, ...overrides }
  // The composable pins a fixed useFetch key, so without clearing it the
  // first payload is cached and every later case silently asserts
  // against it — which is how the first draft of this file "passed" the
  // three cases that expect false and failed the rest.
  clearNuxtData('tenant-legal-identity')
  const result = useMerchantIdentity()
  const deadline = Date.now() + 2000
  while (result.identity.value === null && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  return result
}

describe('what counts as having an identity to publish', () => {
  it('a name alone is not a disclosure', async () => {
    const { hasIdentity } = await load({ name: 'Webside' })
    expect(hasIdentity.value).toBe(false)
  })

  it('an identifier with no name is not one either', async () => {
    const { hasIdentity } = await load({ registrationNumber: '123456789000' })
    expect(hasIdentity.value).toBe(false)
  })

  it.each([
    ['a GEMI number', { registrationNumber: '123456789000' }],
    ['a VAT id', { vatId: 'EL999999999' }],
    ['a street', { addressLine1: 'Ermou 1' }],
    ['a city', { city: 'Θεσσαλονίκη' }],
  ])('a name plus %s is', async (_label, extra) => {
    const { hasIdentity } = await load({ name: 'Acme', ...extra })
    expect(hasIdentity.value).toBe(true)
  })

  it('nothing at all renders nothing', async () => {
    const { hasIdentity } = await load({})
    expect(hasIdentity.value).toBe(false)
  })
})

describe('the legal form is not repeated', () => {
  it('appends it when the name omits it', async () => {
    const { legalName } = await load({ name: 'Acme', legalForm: 'ΙΚΕ', city: 'Αθήνα' })
    expect(legalName.value).toBe('Acme ΙΚΕ')
  })

  it('leaves the name alone when it already carries the form', async () => {
    // Merchants routinely type it in; appending again reads as a typo
    // on their own company name.
    const { legalName } = await load({
      name: 'Acme MON IKE',
      legalForm: 'IKE',
      city: 'Αθήνα',
    })
    expect(legalName.value).toBe('Acme MON IKE')
  })

  it('matches case-insensitively in Greek', async () => {
    const { legalName } = await load({
      name: 'ΑΚΜΗ ΙΚΕ',
      legalForm: 'ικε',
      city: 'Αθήνα',
    })
    expect(legalName.value).toBe('ΑΚΜΗ ΙΚΕ')
  })
})

describe('the registered seat reads as one line', () => {
  it('joins street, postcode, city and country', async () => {
    const { registeredSeat } = await load({
      name: 'Acme',
      addressLine1: 'Ερμού 1',
      addressLine2: 'Όροφος 2',
      postalCode: '10563',
      city: 'Αθήνα',
      country: 'Ελλάδα',
    })
    expect(registeredSeat.value).toBe('Ερμού 1, Όροφος 2, 10563 Αθήνα, Ελλάδα')
  })

  it('does not leave stray separators when parts are missing', async () => {
    const { registeredSeat } = await load({
      name: 'Acme',
      city: 'Αθήνα',
    })
    expect(registeredSeat.value).toBe('Αθήνα')
  })
})
