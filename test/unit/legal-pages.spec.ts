import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { LEGAL_PAGE_SLUGS, LEGAL_ROUTE_SLUGS } from '../../app/utils/legalPages'

/**
 * The shipped legal pages are PLATFORM text published under the
 * MERCHANT's name, which is the wrong way round for a binding document.
 * Two defects followed from that:
 *
 * 1. The terms fixed exclusive jurisdiction to one city's courts for
 *    every tenant, whoever and wherever they were — and under Brussels I
 *    Recast (Reg. 1215/2012 arts. 17-19) a pre-dispute clause that
 *    deprives a consumer of their home courts has no legal force
 *    anyway.
 * 2. Every tenant is seeded a ContentPage at the matching slug, but the
 *    routes never looked for it and the footer appended published pages
 *    as an EXTRA column — so a merchant who wrote their own terms got
 *    TWO footer links under the same label, pointing at contradictory
 *    documents, both indexable.
 *
 * Asserted against source rather than by rendering: the point is which
 * routes and slugs are NAMED, independent of what i18n resolves them to.
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

const LEGAL_PAGES = {
  'terms-of-use': 'app/pages/terms-of-use.vue',
  'privacy-policy': 'app/pages/privacy-policy.vue',
  'cookies-policy': 'app/pages/cookies-policy.vue',
} as const

describe('legal pages prefer the merchant\'s own content', () => {
  it.each(Object.entries(LEGAL_PAGES))(
    '%s consults its ContentPage slug',
    (_route, path) => {
      const source = read(path)
      expect(source).toContain('useLegalPage')
      expect(source).toContain('LEGAL_ROUTE_SLUGS')
    },
  )

  it.each(Object.entries(LEGAL_PAGES))(
    '%s renders the merchant body instead of boilerplate when present',
    (_route, path) => {
      const source = read(path)
      expect(source).toContain('v-if="hasMerchantPage"')
      // The boilerplate must be the ELSE branch, not rendered alongside.
      expect(source).toContain('v-else')
    },
  )

  it.each(Object.entries(LEGAL_PAGES))(
    '%s does not present the platform date as the merchant\'s',
    (_route, path) => {
      const source = read(path)
      expect(source).toContain('PLATFORM_LAST_UPDATED')
      expect(source).toContain('merchantUpdatedAt')
    },
  )
})

describe('terms name no specific forum', () => {
  const code = stripComments(read(LEGAL_PAGES['terms-of-use']))

  it('does not fix jurisdiction to one city\'s courts', () => {
    // Pre-dispute exclusive-forum clauses have no legal force against
    // consumers (Reg. 1215/2012 art. 19), and naming a city the
    // merchant has no connection to is wrong on its face.
    expect(code).not.toContain('Δικαστηρίων της Αθήνας')
    expect(code).not.toContain('αποκλειστική αρμοδιότητα των Δικαστηρίων')
  })

  it('preserves the consumer\'s mandatory protections', () => {
    // Rome I art. 6 (governing law) and Brussels I Recast arts. 17-19
    // (home-court right) are what a compliant clause must yield to.
    expect(code).toContain('593/2008')
    expect(code).toContain('1215/2012')
  })

  it('states the art. 18 forum asymmetry in BOTH directions', () => {
    // Art 18(1) lets the consumer sue the trader in either forum, but
    // art 18(2) lets the trader sue the consumer ONLY at the consumer's
    // domicile. The first draft of this clause named the seller's-seat
    // courts as competent and reserved only the consumer's right to sue
    // at home — silent on 18(2), so a merchant would read it as licence
    // to sue a customer in the merchant's own court. Both halves must
    // be stated or the clause misleads the party relying on it.
    expect(code).toMatch(/ο καταναλωτής μπορεί να στραφεί κατά του πωλητή/)
    expect(code).toMatch(/ο πωλητής μπορεί να στραφεί κατά του καταναλωτή/)
    // The restriction on the trader is the half that is easy to drop.
    expect(code).toMatch(/μόνο<\/strong> στα δικαστήρια/)
  })
})

describe('the footer does not double-link a legal page', () => {
  const code = stripComments(read('app/composables/useFooterLinks.ts'))

  it('filters legal slugs out of the Pages column', () => {
    expect(code).toContain('LEGAL_PAGE_SLUGS')
  })

  it('only suppresses when the base already links that route', () => {
    // An operator-configured footer may omit the legal link; filtering
    // unconditionally would remove the ONLY route to a page the law
    // requires to be reachable.
    expect(code).toContain('linkedPaths')
  })
})

describe('the route/slug map is the single source of truth', () => {
  it('covers every shipped legal route', () => {
    expect(Object.keys(LEGAL_ROUTE_SLUGS).sort()).toEqual([
      'cookies-policy',
      'privacy-policy',
      'return-policy',
      'terms-of-use',
    ])
  })

  it('exposes the slugs as a lookup set', () => {
    for (const slug of Object.values(LEGAL_ROUTE_SLUGS)) {
      expect(LEGAL_PAGE_SLUGS.has(slug)).toBe(true)
    }
  })

  it('maps cookies-policy, which had no backing slug at all', () => {
    expect(LEGAL_ROUTE_SLUGS['cookies-policy']).toBe('cookies')
  })
})
