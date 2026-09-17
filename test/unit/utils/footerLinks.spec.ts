import { describe, expect, it } from 'vitest'
import { dedupeFooterContentPages } from '~~/shared/utils/footerLinks'
import type { FooterLink, FooterLinkColumn } from '~~/shared/utils/footerLinks'

/**
 * One destination, one footer link.
 *
 * Two regressions shipped to production here. First `/terms-of-use`,
 * `/privacy-policy` and `/cookies-policy` each appeared TWICE in
 * webside's footer — once in the operator's "Όροι & Προϋποθέσεις"
 * column and once in "Σελίδες" — because the dedupe derived the slug
 * from the last segment of the href, which only equals the slug for
 * `/info/<slug>`. Then, with that fixed by keying on the slug, demo
 * still listed `/info/faq` and `/info/shipping-info` twice: the filter
 * only ever considered LEGAL slugs, so a plain CMS page the operator
 * had already linked was duplicated just the same.
 *
 * The rule that covers both, and needs no slug: drop a Pages entry
 * whose route the base columns already link.
 *
 * The old guard asserted only that `LEGAL_PAGE_SLUGS` was MENTIONED in
 * the composable's source, so it stayed green throughout. These assert
 * behaviour.
 */

const legalColumn: FooterLinkColumn = {
  label: 'Όροι & Προϋποθέσεις',
  children: [
    { label: 'Όροι Χρήσης', to: '/terms-of-use' },
    { label: 'Πολιτική Απορρήτου', to: '/privacy-policy' },
    { label: 'Πολιτική Cookies', to: '/cookies-policy' },
  ],
}

// Modelled on demo's real footer: the operator links the FAQ from
// their own "Εξυπηρέτηση" column, and it is not a legal page.
const serviceColumn: FooterLinkColumn = {
  label: 'Εξυπηρέτηση',
  children: [
    { label: 'Επικοινωνία', to: '/contact' },
    { label: 'Συχνές Ερωτήσεις', to: '/info/faq' },
  ],
}

const pages: FooterLink[] = [
  { label: 'Όροι Χρήσης', to: '/terms-of-use' },
  { label: 'Πολιτική Απορρήτου', to: '/privacy-policy' },
  { label: 'Πολιτική Επιστροφών', to: '/return-policy' },
  { label: 'Συχνές Ερωτήσεις', to: '/info/faq' },
]

describe('dedupeFooterContentPages', () => {
  it('drops a legal page the base column already links', () => {
    const kept = dedupeFooterContentPages([legalColumn], pages)

    expect(kept.map(c => c.to)).toEqual(['/return-policy', '/info/faq'])
  })

  it('drops a NON-legal page the base column already links', () => {
    // demo's footer carried /info/faq and /info/shipping-info in both
    // "Εξυπηρέτηση" and "Σελίδες" for exactly as long as this filter
    // was restricted to the legal slugs.
    const kept = dedupeFooterContentPages([legalColumn, serviceColumn], pages)

    expect(kept.map(c => c.to)).toEqual(['/return-policy'])
  })

  it('leaves no href listed twice across the whole footer', () => {
    const base = [legalColumn, serviceColumn]
    const kept = dedupeFooterContentPages(base, pages)
    const all = [...base.flatMap(c => c.children), ...kept].map(c => c.to)

    expect(all).toEqual([...new Set(all)])
  })

  it('keeps a page the base columns do NOT link', () => {
    // Removing it would leave no route at all to a page the law
    // requires to be reachable.
    const kept = dedupeFooterContentPages([legalColumn], pages)

    expect(kept.map(c => c.to)).toContain('/return-policy')
  })

  it('keeps everything when the base links nothing', () => {
    const kept = dedupeFooterContentPages([], pages)

    expect(kept).toHaveLength(pages.length)
  })

  it('matches across the locale prefix', () => {
    // The base carries NavigationMenu rows verbatim from Django, while
    // the Pages column is built with localePath(). On a tenant serving
    // `en` those are the same destination spelled two ways, and a raw
    // string comparison would list both.
    const kept = dedupeFooterContentPages([legalColumn], [
      { label: 'Terms of Use', to: '/en/terms-of-use' },
      { label: 'Returns', to: '/en/return-policy' },
    ])

    expect(kept.map(c => c.to)).toEqual(['/en/return-policy'])
  })

  it('matches when it is the BASE that carries the prefix', () => {
    const kept = dedupeFooterContentPages(
      [{ label: 'Legal', children: [{ label: 'Terms', to: '/en/terms-of-use' }] }],
      [
        { label: 'Όροι Χρήσης', to: '/terms-of-use' },
        { label: 'Πολιτική Επιστροφών', to: '/return-policy' },
      ],
    )

    expect(kept.map(c => c.to)).toEqual(['/return-policy'])
  })

  it('does not treat a two-letter route segment as a locale', () => {
    // `splitLocale` checks the prefix against SUPPORTED_LOCALES, so a
    // genuine top-level route that happens to be two characters long
    // keeps its first segment and stays distinct.
    const kept = dedupeFooterContentPages(
      [{ label: 'Info', children: [{ label: 'Policy', to: '/policy' }] }],
      [{ label: 'EU Policy', to: '/eu/policy' }],
    )

    expect(kept.map(c => c.to)).toEqual(['/eu/policy'])
  })

  it('does not match on the href tail, which is what broke first', () => {
    // A page whose href tail happens to equal a legal route must not be
    // suppressed just because the base links that route.
    const kept = dedupeFooterContentPages([legalColumn], [
      { label: 'Όροι Χρήσης', to: '/terms-of-use' },
      { label: 'Άλλο', to: '/info/terms-of-use' },
    ])

    expect(kept.map(c => c.to)).toEqual(['/info/terms-of-use'])
  })
})
