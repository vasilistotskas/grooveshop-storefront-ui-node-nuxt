import { describe, expect, it } from 'vitest'
import {
  composeMetaDescription,
  gateLocaleHeadByTenant,
  META_DESCRIPTION_MAX_LENGTH,
  META_DESCRIPTION_MIN_LENGTH,
  rebaseLocaleHeadOrigins,
} from '../../../app/utils/seoHead'

// What useLocaleHead({ seo: true }) emits for a page on a platform
// built with `el` (default) + `en`, as observed live on webside.gr.
const I18N_HEAD = {
  link: [
    { key: 'i18n-xd', rel: 'alternate', href: 'https://tenant.example/products', hreflang: 'x-default' },
    { key: 'i18n-alt-el', rel: 'alternate', href: 'https://tenant.example/products', hreflang: 'el' },
    { key: 'i18n-alt-el-GR', rel: 'alternate', href: 'https://tenant.example/products', hreflang: 'el-GR' },
    { key: 'i18n-alt-en', rel: 'alternate', href: 'https://tenant.example/en/products', hreflang: 'en' },
    { key: 'i18n-alt-en-US', rel: 'alternate', href: 'https://tenant.example/en/products', hreflang: 'en-US' },
    { key: 'i18n-can', rel: 'canonical', href: 'https://tenant.example/products' },
    { key: 'md', rel: 'alternate', type: 'text/markdown', href: '/products.md' },
  ],
  meta: [
    { key: 'i18n-og-url', property: 'og:url', content: 'https://tenant.example/products' },
    { key: 'i18n-og', property: 'og:locale', content: 'el_GR' },
    { key: 'i18n-og-alt-en-US', property: 'og:locale:alternate', content: 'en_US' },
  ],
}

describe('gateLocaleHeadByTenant', () => {
  it('drops every alternate for a single-language tenant', () => {
    const out = gateLocaleHeadByTenant(I18N_HEAD, ['el'])

    expect(out.link.map(l => l.key)).toEqual(['i18n-can', 'md'])
    expect(out.meta.map(m => m.key)).toEqual(['i18n-og-url', 'i18n-og'])
  })

  it('keeps every alternate for a tenant serving both locales', () => {
    const out = gateLocaleHeadByTenant(I18N_HEAD, ['el', 'en'])

    expect(out).toEqual(I18N_HEAD)
  })

  it('drops only the unserved locale for a bilingual tenant', () => {
    const head = {
      link: [
        ...I18N_HEAD.link,
        { key: 'i18n-alt-de', rel: 'alternate', href: 'https://tenant.example/de/products', hreflang: 'de' },
      ],
      meta: [
        ...I18N_HEAD.meta,
        { key: 'i18n-og-alt-de-DE', property: 'og:locale:alternate', content: 'de_DE' },
      ],
    }

    const out = gateLocaleHeadByTenant(head, ['el', 'en'])

    expect(out.link.map(l => l.key)).not.toContain('i18n-alt-de')
    expect(out.link.map(l => l.key)).toContain('i18n-alt-en-US')
    expect(out.meta.map(m => m.key)).not.toContain('i18n-og-alt-de-DE')
    expect(out.meta.map(m => m.key)).toContain('i18n-og-alt-en-US')
  })

  it('fails open while the tenant is unresolved', () => {
    expect(gateLocaleHeadByTenant(I18N_HEAD, [])).toBe(I18N_HEAD)
  })

  it('tolerates a head without link or meta', () => {
    expect(gateLocaleHeadByTenant({ htmlAttrs: { lang: 'el-GR' } }, ['el']))
      .toEqual({ htmlAttrs: { lang: 'el-GR' } })
  })
})

const HEAD = {
  link: [
    { id: 'i18n-can', rel: 'canonical', href: 'https://platform.example/products' },
    { id: 'i18n-alt-el', rel: 'alternate', href: 'https://platform.example/products', hreflang: 'el-GR' },
    { id: 'md', rel: 'alternate', href: '/products.md' },
    { id: 'ext', rel: 'preconnect', href: 'https://fonts.gstatic.com' },
  ],
  meta: [
    { id: 'i18n-og-url', property: 'og:url', content: 'https://platform.example/products' },
    { id: 'i18n-og-loc', property: 'og:locale', content: 'el_GR' },
  ],
}

describe('rebaseLocaleHeadOrigins', () => {
  it('rewrites only platform-origin urls onto the tenant origin', () => {
    const out = rebaseLocaleHeadOrigins(HEAD, 'https://platform.example', 'https://tenant.example')
    expect(out.link?.[0]?.href).toBe('https://tenant.example/products')
    expect(out.link?.[1]?.href).toBe('https://tenant.example/products')
    // relative + third-party hrefs untouched
    expect(out.link?.[2]?.href).toBe('/products.md')
    expect(out.link?.[3]?.href).toBe('https://fonts.gstatic.com')
    expect(out.meta?.[0]?.content).toBe('https://tenant.example/products')
    expect(out.meta?.[1]?.content).toBe('el_GR')
  })

  it('does not rewrite prefix-only host matches', () => {
    const head = { link: [{ href: 'https://platform.example.evil/x' }] }
    const out = rebaseLocaleHeadOrigins(head, 'https://platform.example', 'https://tenant.example')
    expect(out.link?.[0]?.href).toBe('https://platform.example.evil/x')
  })

  it('handles the bare origin and trailing slashes', () => {
    const head = { link: [{ href: 'https://platform.example' }, { href: 'https://platform.example/' }] }
    const out = rebaseLocaleHeadOrigins(head, 'https://platform.example/', 'https://tenant.example')
    expect(out.link?.[0]?.href).toBe('https://tenant.example')
    expect(out.link?.[1]?.href).toBe('https://tenant.example/')
  })

  it('no-ops when origins match or are missing', () => {
    expect(rebaseLocaleHeadOrigins(HEAD, 'https://platform.example', 'https://platform.example')).toBe(HEAD)
    expect(rebaseLocaleHeadOrigins(HEAD, '', 'https://tenant.example')).toBe(HEAD)
  })
})

describe('composeMetaDescription', () => {
  it('returns a lead that already fills the band untouched', () => {
    const lead = 'A'.repeat(META_DESCRIPTION_MIN_LENGTH)
    expect(composeMetaDescription([lead, 'body copy'])).toBe(lead)
  })

  it('extends a short lead with what follows instead of replacing it', () => {
    expect(composeMetaDescription(['Short strapline', 'The article opens here.']))
      .toBe('Short strapline. The article opens here.')
  })

  it('joins on the lead\'s own punctuation when it has some', () => {
    expect(composeMetaDescription(['Ends already.', 'Next sentence.']))
      .toBe('Ends already. Next sentence.')
    expect(composeMetaDescription(['Ρωτάει κάτι;', 'Και απαντά.']))
      .toBe('Ρωτάει κάτι; Και απαντά.')
  })

  it('skips empty and whitespace-only fragments', () => {
    expect(composeMetaDescription(['Lead', '', null, undefined, '   ', 'Tail']))
      .toBe('Lead. Tail')
  })

  it('collapses the whitespace inside a fragment', () => {
    expect(composeMetaDescription(['  Lead\n\ncopy  ', 'Tail']))
      .toBe('Lead copy. Tail')
  })

  it('returns undefined rather than an empty description', () => {
    expect(composeMetaDescription([])).toBeUndefined()
    expect(composeMetaDescription([null, undefined, '', '  '])).toBeUndefined()
  })

  it('truncates on a word boundary, inside the budget, with an ellipsis', () => {
    const result = composeMetaDescription(['Short lead', 'word '.repeat(80)])!

    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH)
    expect(result.endsWith('…')).toBe(true)
    expect(result).not.toMatch(/\s…$/)
    // No half-word before the ellipsis.
    expect(result.slice(0, -1).split(' ').at(-1)).toBe('word')
  })

  it('hard-cuts a single word longer than the whole budget', () => {
    const result = composeMetaDescription(['x'.repeat(400)])!

    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH)
    expect(result.endsWith('…')).toBe(true)
  })

  it('truncates an over-long lead that already fills the band', () => {
    const result = composeMetaDescription(['word '.repeat(60)])!

    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH)
    expect(result.endsWith('…')).toBe(true)
  })

  it('lifts a real post out of the "too short" band', () => {
    // Post 2 on webside.gr: an 83-character subtitle, which is what
    // Ahrefs reported as too short on 63 of the 79 live posts.
    const subtitle
      = 'Ένας σύντομος οδηγός σχετικά με τα mAh και την συσχέτιση που έχουνε με τα powerbank'
    const body
      = 'Ειδικά αν βρίσκεσαι στην αναζήτηση για powerbank, τα mAh αποτελούν τον πιο βασικό δείκτη της χωρητικότητας που θα έχεις διαθέσιμη.'

    const result = composeMetaDescription([subtitle, body])!

    expect(subtitle.length).toBeLessThan(META_DESCRIPTION_MIN_LENGTH)
    expect(result.startsWith(subtitle)).toBe(true)
    expect(result.length).toBeGreaterThanOrEqual(META_DESCRIPTION_MIN_LENGTH)
    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX_LENGTH)
  })

  it('honours an overridden band', () => {
    expect(composeMetaDescription(['Lead', 'Tail'], { min: 2 })).toBe('Lead')
    expect(composeMetaDescription(['Lead copy here', 'Tail'], { min: 99, max: 10 }))
      .toBe('Lead…')
  })
})
