import { describe, expect, it } from 'vitest'
import { dedupeFooterContentPages } from '~~/shared/utils/footerLinks'
import type { FooterLink, FooterLinkColumn } from '~~/shared/utils/footerLinks'

/**
 * The regression this exists for shipped to production: `/terms-of-use`,
 * `/privacy-policy` and `/cookies-policy` each appeared TWICE in
 * webside's footer — once in the operator's "Όροι & Προϋποθέσεις"
 * column and once in "Σελίδες".
 *
 * The dedupe had derived the slug from the last segment of the href,
 * which only equals the slug for `/info/<slug>`. When the Pages column
 * started linking canonical routes instead, `'terms-of-use'` stopped
 * matching the slug `'terms'` and nothing was filtered.
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

const pages: FooterLink[] = [
  { label: 'Όροι Χρήσης', to: '/terms-of-use', slug: 'terms' },
  { label: 'Πολιτική Απορρήτου', to: '/privacy-policy', slug: 'privacy' },
  { label: 'Πολιτική Επιστροφών', to: '/return-policy', slug: 'return-policy' },
  { label: 'Συχνές Ερωτήσεις', to: '/info/faq', slug: 'faq' },
]

describe('dedupeFooterContentPages', () => {
  it('drops a legal page the base column already links', () => {
    const kept = dedupeFooterContentPages([legalColumn], pages)

    expect(kept.map(c => c.to)).toEqual(['/return-policy', '/info/faq'])
  })

  it('leaves no href listed twice across the whole footer', () => {
    const kept = dedupeFooterContentPages([legalColumn], pages)
    const all = [...legalColumn.children, ...kept].map(c => c.to)

    expect(all).toEqual([...new Set(all)])
  })

  it('keeps a legal page the base column does NOT link', () => {
    // Removing it would leave no route at all to a page the law
    // requires to be reachable.
    const kept = dedupeFooterContentPages([legalColumn], pages)

    expect(kept.map(c => c.slug)).toContain('return-policy')
  })

  it('never drops a non-legal page', () => {
    const kept = dedupeFooterContentPages([legalColumn], pages)

    expect(kept.map(c => c.slug)).toContain('faq')
  })

  it('keeps everything when the base links nothing', () => {
    const kept = dedupeFooterContentPages([], pages)

    expect(kept).toHaveLength(pages.length)
  })

  it('ignores an entry carrying no slug', () => {
    // Operator-configured links have no ContentPage behind them.
    const kept = dedupeFooterContentPages(
      [legalColumn],
      [{ label: 'Κάτι', to: '/terms-of-use' }],
    )

    expect(kept).toHaveLength(1)
  })

  it('does not match on the href tail, which is what broke', () => {
    // A page whose slug happens to end like a legal route must not be
    // suppressed, and a legal slug must be suppressed even though its
    // href tail differs from it.
    const kept = dedupeFooterContentPages([legalColumn], [
      { label: 'Όροι Χρήσης', to: '/terms-of-use', slug: 'terms' },
      { label: 'Άλλο', to: '/info/terms-of-use', slug: 'terms-of-use' },
    ])

    expect(kept.map(c => c.slug)).toEqual(['terms-of-use'])
  })
})
