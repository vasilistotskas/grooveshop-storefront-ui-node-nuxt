import { describe, expect, it } from 'vitest'
import { gateLocaleHeadByTenant, rebaseLocaleHeadOrigins } from '../../../app/utils/seoHead'

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
