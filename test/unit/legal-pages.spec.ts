import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { LEGAL_PAGE_SLUGS, LEGAL_ROUTE_SLUGS } from '../../shared/utils/legalPages'

/**
 * The legal routes render the tenant's own ContentPage and nothing else.
 *
 * They used to ship the platform's Greek legal text as markup and fall
 * back to it whenever the tenant had published nothing — platform text
 * published under the merchant's name, on a binding document. Worse, the
 * fallback meant two render paths of which only the boilerplate one was
 * ever exercised, so the merchant path shipped a duplicate `h1` and a
 * table of contents anchored to ids that existed solely in the
 * boilerplate. Both were live on tenant #2's `/privacy-policy`.
 *
 * The text now lives in `page_config/legal_documents.py` on the API and
 * is seeded into every tenant at provisioning, so the assertions about
 * what the DOCUMENT must say moved there
 * (`tests/unit/page_config/test_legal_documents.py`). What is left here
 * is the shape of the routes that render it.
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

describe('legal pages render the tenant\'s own document', () => {
  it.each(Object.entries(LEGAL_PAGES))(
    '%s consults its ContentPage slug',
    (_route, path) => {
      const source = read(path)
      expect(source).toContain('useLegalPage')
      expect(source).toContain('LEGAL_ROUTE_SLUGS')
    },
  )

  it.each(Object.entries(LEGAL_PAGES))(
    '%s has ONE render path, with no boilerplate to fall back to',
    (_route, path) => {
      const code = stripComments(read(path))
      expect(code).not.toContain('hasMerchantPage')
      expect(code).not.toContain('v-else')
      // The tell-tale of inlined legal text: sectioned prose in the
      // template. The document is `v-html` from the API now.
      expect(code).not.toContain('<section id=')
    },
  )

  it.each(Object.entries(LEGAL_PAGES))(
    '%s dates the document by the document, not by a constant',
    (_route, path) => {
      const code = stripComments(read(path))
      expect(code).not.toContain('PLATFORM_LAST_UPDATED')
      expect(code).toContain('updatedAt')
    },
  )

  it.each(Object.entries(LEGAL_PAGES))(
    '%s derives its contents from the document',
    (_route, path) => {
      const code = stripComments(read(path))
      // A hardcoded array is what pointed the sidebar at anchors the
      // merchant's document never had.
      expect(code).not.toMatch(/const tocLinks\s*=\s*\[/)
      expect(code).toContain('tocLinks')
    },
  )

  it.each(Object.entries(LEGAL_PAGES))(
    '%s renders no second h1 of its own',
    (_route, path) => {
      // `UPageHeader :title` already renders the page heading; the
      // article added another, so every merchant page shipped two.
      const code = stripComments(read(path))
      expect(code).not.toContain('<h1')
    },
  )

  it.each(Object.entries(LEGAL_PAGES))(
    '%s fails loudly when the document is absent',
    (_route, path) => {
      // Rendering an empty article with HTTP 200 is a soft-404 on a page
      // the footer links from every other page of the store.
      const code = stripComments(read(path))
      expect(code).toContain('createError')
      expect(code).toContain('hasDocument')
    },
  )
})

describe('one document, one url', () => {
  it('redirects /info/<slug> to the canonical legal route', () => {
    // Both answered 200 with the same body and a canonical pointing at
    // themselves — tenant #2 had /privacy-policy and /info/privacy
    // competing that way in production.
    const code = stripComments(read('app/pages/info/[slug].vue'))
    expect(code).toContain('LEGAL_ROUTE_SLUGS')
    expect(code).toContain('redirectCode: 301')
  })

  it('keeps the redirected slugs out of the sitemap', () => {
    const code = stripComments(read('server/api/__sitemap__/urls.ts'))
    expect(code).toContain('LEGAL_PAGE_SLUGS')
    // ...while still listing the content pages that have no route of
    // their own, which the sitemap never sourced at all before.
    expect(code).toContain('/info/')
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

  it('lives in shared/, where Nitro can read it too', () => {
    // The sitemap source and the redirect both run server-side; when
    // this map lived in app/utils they could not see it, which is how
    // the duplicate-URL hole stayed open.
    expect(() => read('shared/utils/legalPages.ts')).not.toThrow()
  })
})
