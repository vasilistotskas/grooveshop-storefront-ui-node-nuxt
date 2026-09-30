import { describe, expect, it } from 'vitest'
import { LEGAL_ROUTE_BY_SLUG } from '~~/shared/utils/legalPages'

/**
 * The sitemap source and the `/info/<slug>` redirect key on the slug →
 * canonical path lookup. The slugs are the ones Django seeds every
 * tenant with (`page_config/legal_documents.py`), so they are written
 * out rather than derived: a renamed slug on either side has to show
 * up here.
 */
describe('LEGAL_ROUTE_BY_SLUG', () => {
  it('serves each seeded legal document at exactly one canonical path', () => {
    expect(Object.fromEntries(LEGAL_ROUTE_BY_SLUG)).toEqual({
      'terms': '/terms-of-use',
      'privacy': '/privacy-policy',
      'cookies': '/cookies-policy',
      'return-policy': '/return-policy',
    })
  })

  it('does not treat a slug without a dedicated route as legal', () => {
    expect(LEGAL_ROUTE_BY_SLUG.has('faq')).toBe(false)
  })
})
