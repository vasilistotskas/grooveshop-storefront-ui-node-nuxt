import { describe, expect, it } from 'vitest'
import { rebaseLocaleHeadOrigins } from '../../../app/utils/seoHead'

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
