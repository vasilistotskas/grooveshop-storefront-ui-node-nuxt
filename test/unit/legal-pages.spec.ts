import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { LEGAL_ROUTE_BY_SLUG, LEGAL_ROUTE_SLUGS } from '../../shared/utils/legalPages'

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

// EVERY route in the map, not just the three that shipped boilerplate.
// `return-policy` was in LEGAL_ROUTE_SLUGS while its page rendered an
// empty <div />, which stayed harmless only until /info/<slug> began
// redirecting to its canonical route — at which point the merchant's
// published returns policy became unreachable in production.
const LEGAL_PAGES = {
  'terms-of-use': 'app/pages/terms-of-use.vue',
  'privacy-policy': 'app/pages/privacy-policy.vue',
  'cookies-policy': 'app/pages/cookies-policy.vue',
  'return-policy': 'app/pages/return-policy.vue',
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
    expect(code).toContain('LEGAL_ROUTE_BY_SLUG')
    // ...while still listing the content pages that have no route of
    // their own, which the sitemap never sourced at all before.
    expect(code).toContain('/info/')
  })

  it('never puts a legal route in the static sitemap exclude list', () => {
    // `sitemap.exclude` is applied to the FINAL url set, sources
    // included -- `resolveSitemapEntries` filters
    // `sources.flatMap(s => s.urls)`, not just the auto-discovered
    // routes. Excluding a legal route there drops it for EVERY tenant,
    // including the ones that have the document, and no per-tenant
    // source can add it back.
    const config = read('nuxt.config.ts')
    // Anchor inside the `sitemap:` block: nuxt.config.ts has an earlier
    // one-line `exclude: [` (the nitro/api one), and slicing from the
    // FIRST match made this assertion vacuous.
    const sitemap = config.slice(config.indexOf('\n  sitemap: {'))
    const start = sitemap.indexOf('exclude: [')
    const exclude = sitemap.slice(start, sitemap.indexOf(']', start))

    // Proves the anchor still points at the list this test is about,
    // so a future reshuffle fails loudly instead of silently passing.
    expect(exclude).toContain('\'/cart\'')

    for (const route of Object.keys(LEGAL_ROUTE_SLUGS)) {
      expect(exclude, `/${route} must not be excluded statically`)
        .not.toContain(`'/${route}'`)
    }
  })

  it('gates every legal route on the tenant having that page', () => {
    // Which legal documents a store has is per-tenant data: the routes
    // exist for everyone and 404 where the ContentPage is missing.
    // `/return-policy` is seeded UNPUBLISHED, so most tenants 404 there.
    const code = read('server/plugins/sitemap-tenant-gate.ts')
    expect(code).toContain('contentSlug')
    expect(code).toContain('publishedContentSlugsForHost')
    // Derived from the map, so a new legal route cannot be added
    // without being gated.
    expect(code).toContain('Object.entries(LEGAL_ROUTE_SLUGS)')
  })
})

describe('the footer does not double-link a page', () => {
  // The BEHAVIOUR lives in test/unit/utils/footerLinks.spec.ts. The
  // assertions here used to check only that `LEGAL_PAGE_SLUGS` and
  // `linkedPaths` were MENTIONED in the composable — and they stayed
  // green while all three legal routes were rendering twice in
  // webside's live footer, because mentioning a symbol says nothing
  // about what it filters. What is worth asserting here is that the
  // composable still delegates rather than growing its own copy.
  const code = stripComments(read('app/composables/useFooterLinks.ts'))

  it('delegates the dedupe to the shared, tested helper', () => {
    expect(code).toContain('dedupeFooterContentPages')
  })

  it('keeps no filtering rule of its own', () => {
    // Two copies of the rule is how the legal-only version survived a
    // change to the hrefs it was matching against.
    expect(code).not.toContain('LEGAL_PAGE_SLUGS')
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

  it('inverts to a slug -> canonical path lookup', () => {
    // The sitemap keys on this. Derived from the map above rather than
    // written out again, so the two cannot drift apart.
    for (const [route, slug] of Object.entries(LEGAL_ROUTE_SLUGS)) {
      expect(LEGAL_ROUTE_BY_SLUG.get(slug)).toBe(`/${route}`)
    }
    expect(LEGAL_ROUTE_BY_SLUG.size).toBe(
      Object.keys(LEGAL_ROUTE_SLUGS).length,
    )
  })

  it('maps cookies-policy, which had no backing slug at all', () => {
    expect(LEGAL_ROUTE_SLUGS['cookies-policy']).toBe('cookies')
  })

  it('has a page that renders the document for EVERY mapped route', () => {
    // The redirect sends /info/<slug> here, so a route in this map that
    // does not render its ContentPage is a dead end for a published
    // document — not a cosmetic gap.
    for (const route of Object.keys(LEGAL_ROUTE_SLUGS)) {
      const source = read(`app/pages/${route}.vue`)
      expect(source, `${route} does not render its document`).toContain(
        'useLegalPage',
      )
    }
  })

  it('links the canonical route from the footer, not the redirect', () => {
    const code = stripComments(read('app/composables/useFooterLinks.ts'))
    expect(code).toContain('LEGAL_ROUTE_SLUGS')
  })

  it('lives in shared/, where Nitro can read it too', () => {
    // The sitemap source and the redirect both run server-side; when
    // this map lived in app/utils they could not see it, which is how
    // the duplicate-URL hole stayed open.
    expect(() => read('shared/utils/legalPages.ts')).not.toThrow()
  })
})
