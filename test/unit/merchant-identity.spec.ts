import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A storefront has to say who is selling it to you.
 *
 * - e-Commerce Directive 2000/31/EC art. 5(1): name, geographic address
 *   of establishment, contact details, trade register + registration
 *   number, and VAT number, "easily, directly and permanently
 *   accessible".
 * - N. 4919/2022 art. 22 §3: the GEMI number on the e-shop.
 * - N. 4919/2022 art. 22 §4: legal form, name, registered seat and
 *   liquidation status "σε εμφανές σημείο". €200-500 under art. 50(γ).
 *
 * "Permanently accessible" and "prominent" is why this lives in the
 * footer of BOTH layouts rather than on a single legal page — a mobile
 * shopper who never sees the desktop footer is owed the same disclosure.
 */

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

const stripComments = (source: string) =>
  source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return !trimmed.startsWith('//') && !trimmed.startsWith('*')
        && !trimmed.startsWith('/*') && !trimmed.startsWith('<!--')
    })
    .join('\n')

describe('the identity renders in a permanently accessible place', () => {
  it.each([
    ['desktop', 'app/components/Footer/Desktop.vue'],
    ['mobile', 'app/components/Footer/Mobile.vue'],
  ])('the %s footer publishes it', (_name, path) => {
    // Both, not either: a layout that omits it fails the disclosure for
    // every shopper on that layout.
    expect(stripComments(read(path))).toContain('<MerchantIdentity')
  })
})

describe('every legally required field is rendered', () => {
  const component = read('app/components/MerchantIdentity.vue')

  it.each([
    ['company name', 'legalName'],
    ['registered seat', 'registeredSeat'],
    ['GEMI / registration number', 'registrationNumber'],
    ['VAT id', 'vatId'],
    ['contact email', 'email'],
    ['liquidation status', 'inLiquidation'],
  ])('renders %s', (_label, token) => {
    expect(component).toContain(token)
  })

  it('labels the identifiers in Greek, since they are Greek registers', () => {
    expect(component).toContain('ΓΕΜΗ')
    expect(component).toContain('ΑΦΜ')
  })
})

describe('an unconfigured store renders nothing rather than a shell', () => {
  const component = read('app/components/MerchantIdentity.vue')

  it('guards the whole block', () => {
    // A heading over blank rows is not more compliant than silence, and
    // it reads as a broken page.
    expect(component).toContain('v-if="hasIdentity"')
  })

  it('uses <address>, which is what this content is', () => {
    expect(component).toContain('<address')
  })
})

describe('the composable', () => {
  const composable = read('app/composables/useMerchantIdentity.ts')

  it('swallows the missing-identity case instead of erroring', () => {
    // A store mid-onboarding has published nothing; that is normal.
    expect(composable).toContain('default: () => null')
  })

  it('does not repeat the legal form when it is already in the name', () => {
    // Merchants type it into the name ("Acme MON IKE"); appending it
    // again reads as a typo on their own company name.
    expect(composable).toContain('includes(')
    expect(composable).toContain('toLocaleUpperCase')
  })

  it('exposes completeness so the gap can be surfaced to the merchant', () => {
    expect(composable).toContain('isComplete')
    expect(composable).toContain('missingFields')
  })
})

describe('the server route is tenant-scoped', () => {
  const route = read('server/api/tenant/legal-identity.get.ts')

  it('caches per tenant', () => {
    // Without tenantCacheKey one store's identity is served to another —
    // which for THIS payload means publishing the wrong company's VAT
    // number and registered address as the seller.
    expect(route).toContain('tenantCacheKey')
  })

  it('forwards the tenant host', () => {
    // Raw $fetch carries no X-Forwarded-Host, so Django resolves the
    // public schema and every store gets the same empty answer.
    expect(route).toContain('useBackendFetch')
  })

  it('validates the response against the generated schema', () => {
    expect(route).toContain('zApiV1TenantLegalIdentityRetrieveResponse')
  })
})
