import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A route's `[slug]` segment is decorative, so every entity page (product,
 * product category, blog post, blog category) that declares its own path
 * answers a permanent redirect when the URL asked for is not it. Each
 * stale link would otherwise be a second address of the same page.
 */
const navigateToMock = vi.hoisted(() => vi.fn())
mockNuxtImport('navigateTo', () => navigateToMock)

/** The permanent redirects asked for; the i18n module's own language-switch navigations are not them. */
const redirects = () => navigateToMock.mock.calls.filter(([, options]) => options?.redirectCode === 301)

const route = vi.hoisted(() => ({
  path: '',
  query: {} as Record<string, string>,
  hash: '',
}))
mockNuxtImport('useRoute', () => () => ({
  params: {},
  query: route.query,
  path: route.path,
  fullPath: route.path,
  name: '',
  hash: route.hash,
  matched: [],
  meta: {},
}))

async function declareAt(url: string, path: string | undefined, locales: string[] = ['el']) {
  const [pathname = '', search = '', hash = ''] = url.split(/[?#]/)
  route.path = pathname
  route.query = Object.fromEntries(new URLSearchParams(search))
  route.hash = hash ? `#${hash}` : ''
  await mountSuspended(
    defineComponent({
      setup() {
        useDocumentLocales().declare(locales, path)
        return () => null
      },
    }),
  )
}

describe('useDocumentLocales().declare', () => {
  beforeEach(async () => {
    navigateToMock.mockClear()
    setTenant({ availableLocales: ['el', 'en'] })
    await useNuxtApp().$i18n.setLocale('el')
  })

  it.each([
    ['a product', '/products/2/mini-power-bank', '/products/2/mini-powerbank-5000mah'],
    ['a product category', '/products/category/4/power-banks', '/products/category/4/old-name'],
    ['a blog post', '/blog/post/52/spring-guide', '/blog/post/52/an-old-slug'],
    ['a blog category', '/blog/category/3/news', '/blog/category/3/old-news'],
  ])('moves %s asked for at a stale slug to its own, permanently', async (_entity, own, asked) => {
    await declareAt(asked, own)

    expect(redirects()).toEqual([[
      { path: own, query: {}, hash: '' },
      { redirectCode: 301, replace: true },
    ]])
  })

  it('keeps the language prefix, the query and the hash', async () => {
    await useNuxtApp().$i18n.setLocale('en')

    await declareAt('/en/products/2/old?utm_source=mail&page=2#reviews', '/products/2/mini-power-bank', ['el', 'en'])

    expect(redirects()).toEqual([[
      { path: '/en/products/2/mini-power-bank', query: { utm_source: 'mail', page: '2' }, hash: '#reviews' },
      { redirectCode: 301, replace: true },
    ]])
  })

  it('moves a trailing-slash variant to the path without it', async () => {
    await declareAt('/products/2/mini-power-bank/', '/products/2/mini-power-bank')

    expect(redirects()).toHaveLength(1)
  })

  it('leaves a page at its own path alone', async () => {
    await declareAt('/products/2/mini-power-bank?page=2', '/products/2/mini-power-bank')

    expect(redirects()).toEqual([])
  })

  it('has nothing to redirect to for a document that names no path of its own', async () => {
    await declareAt('/terms-of-use', undefined)

    expect(redirects()).toEqual([])
  })
})
