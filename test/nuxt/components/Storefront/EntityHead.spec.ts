import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, type Component } from 'vue'
import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { injectHead } from '#imports'
import BlogPost from '~/components/Storefront/BlogPost.vue'
import WebsideBlogPost from '~/components/variants/webside/Storefront/BlogPost.vue'
import ProductDetail from '~/components/Storefront/ProductDetail.vue'
import WebsideProductDetail from '~/components/variants/webside/Storefront/ProductDetail.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The head of an ENGLISH entity page: its canonical and hreflang set
 * must name only versions that canonicalise to themselves. Ahrefs
 * (2026-10-16, "Hreflang to non-canonical") caught every `/en/**` blog
 * page canonicalising to the Greek URL while the hreflang set offered
 * the English one — each page had written its own canonical and its own
 * `el` / `x-default` alternates.
 *
 * The page declares what it renders and `setupPageHeader` writes the
 * head, so this mounts both together. `useLocaleHead` is replaced by
 * what the module emits for the route (observed live: each locale by
 * its `language` AND by its bare code, plus `x-default`, all built from
 * the ROUTE's own slug) — the thing under test is what the storefront
 * does with it.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)
mockComponent('UTooltip', { template: '<div><slot /></div>' })
// The product page's price trend loads its own history; its own spec covers it.
vi.mock('~/components/Product/PriceTrendDialog.vue', () => ({ default: { template: '<div />' } }))

const route = vi.hoisted(() => ({ path: '', params: {} as Record<string, string>, name: '' }))
mockNuxtImport('useRoute', () => () => ({
  params: route.params,
  query: {},
  path: route.path,
  fullPath: route.path,
  name: route.name,
  hash: '',
  matched: [],
  meta: {},
}))

const ORIGIN = 'https://shop.test'
// The origin the module resolves per store (server/plugins/tenant-site-config.ts).
mockNuxtImport('useSiteConfig', () => () => ({ url: ORIGIN, name: 'Shop', description: '' }))
mockNuxtImport('useLocaleHead', () => () => computed(() => {
  const tail = route.path.replace(/^\/en(?=\/)/, '')
  const el = `${ORIGIN}${tail}`
  const en = `${ORIGIN}/en${tail}`
  const current = route.path.startsWith('/en/') ? en : el
  return {
    link: [
      { key: 'i18n-xd', rel: 'alternate', href: el, hreflang: 'x-default' },
      { key: 'i18n-alt-el', rel: 'alternate', href: el, hreflang: 'el' },
      { key: 'i18n-alt-el-GR', rel: 'alternate', href: el, hreflang: 'el-GR' },
      { key: 'i18n-alt-en', rel: 'alternate', href: en, hreflang: 'en' },
      { key: 'i18n-alt-en-US', rel: 'alternate', href: en, hreflang: 'en-US' },
      { key: 'i18n-can', rel: 'canonical', href: current },
    ],
    meta: [],
  }
}))

const GREEK_AND_ENGLISH = {
  el: { title: 'Οδηγός άνοιξης', subtitle: '', body: '<p>Κείμενο</p>', name: 'Οδηγός' },
  en: { title: 'Spring guide', subtitle: '', body: '<p>Text</p>', name: 'Guide' },
}
const GREEK_ONLY = { el: GREEK_AND_ENGLISH.el }

function post(translations: Record<string, unknown>) {
  return {
    id: 7,
    uuid: fixtureUuid(9, 7),
    slug: 'spring-guide',
    likes: [],
    translations,
    author: { id: 3, uuid: fixtureUuid(9, 3), translations: { el: { bio: '' } } },
    category: { id: 2, uuid: fixtureUuid(9, 2), slug: 'guides', translations: { el: { name: 'Οδηγοί' } } },
    tags: [],
    viewCount: 0,
    likesCount: 0,
    commentsCount: 0,
    tagsCount: 0,
    isPublished: true,
    publishedAt: FIXTURE_TIMESTAMP,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  }
}

function product(translations: Record<string, unknown>) {
  return { ...makeProduct({ id: 123 }), slug: 'bluetooth-speaker', translations }
}

interface Head {
  canonicals: string[]
  alternates: Record<string, string>
}

/** Mount the page under the real head pipeline and read what a crawler would. */
async function headOf(page: Component): Promise<Head> {
  const head = injectHead()
  const before = new Set(head.entries.keys())
  const Harness = defineComponent({
    setup() {
      setupPageHeader()
      return () => h(page)
    },
  })
  const wrapper = await mountSuspended(Harness, { route: false })
  await flushPromises()
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    head.render()
    vi.runOnlyPendingTimers()
  }
  finally {
    vi.useRealTimers()
  }
  const path = (href: string | null) => (href ? new URL(href, ORIGIN).pathname : '')
  const read = {
    canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(l => path(l.getAttribute('href'))),
    alternates: Object.fromEntries(
      [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(l => [
        l.getAttribute('hreflang')!,
        path(l.getAttribute('href')),
      ]),
    ),
  }
  wrapper.unmount()
  for (const key of head.entries.keys()) {
    if (!before.has(key)) head.entries.delete(key)
  }
  return read
}

function visit(path: string, name: string, params: Record<string, string>) {
  route.path = path
  route.name = name
  route.params = params
}

describe.each(trees(BlogPost, WebsideBlogPost))('head of an English blog post ($tree tree)', ({ C: Component }) => {
  beforeEach(async () => {
    clearNuxtData()
    clearCursorState()
    setTenant({ blogEnabled: true, availableLocales: ['el', 'en'] })
    setTenantFeatures({ blog: true, blogComments: true })
    await useNuxtApp().$i18n.setLocale('en')
  })

  /** Serve the post, and the empty answer to everything else the page asks. */
  function serve(translations: Record<string, unknown>) {
    api.routes({
      '/api/blog/posts/7': post(translations),
      '/api/blog/categories/2': post({}).category,
      '/api/shipping/policy': [],
      '/api/*': { count: 0, next: null, previous: null, results: [] },
    })
  }

  afterEach(async () => {
    await useNuxtApp().$i18n.setLocale('el')
  })

  it('is its own canonical, and lists both versions, when it is written in English', async () => {
    serve(GREEK_AND_ENGLISH)
    visit('/en/blog/post/7/spring-guide', 'blog-post-id-slug___en', { id: '7', slug: 'spring-guide' })

    const head = await headOf(Component)

    expect(head.canonicals).toEqual(['/en/blog/post/7/spring-guide'])
    expect(head.alternates).toEqual({
      'x-default': '/blog/post/7/spring-guide',
      'el': '/blog/post/7/spring-guide',
      'en': '/en/blog/post/7/spring-guide',
    })
  })

  it('names the post\'s own slug, not whatever the route carried', async () => {
    serve(GREEK_AND_ENGLISH)
    visit('/en/blog/post/7/an-old-slug', 'blog-post-id-slug___en', { id: '7', slug: 'an-old-slug' })

    const head = await headOf(Component)

    expect(head.canonicals).toEqual(['/en/blog/post/7/spring-guide'])
    expect(head.alternates.en).toBe('/en/blog/post/7/spring-guide')
  })

  it('canonicalises to the Greek post, and offers no English version, when it is not written in English', async () => {
    serve(GREEK_ONLY)
    visit('/en/blog/post/7/spring-guide', 'blog-post-id-slug___en', { id: '7', slug: 'spring-guide' })

    const head = await headOf(Component)

    expect(head.canonicals).toEqual(['/blog/post/7/spring-guide'])
    expect(head.alternates).toEqual({})
  })
})

describe.each(trees(ProductDetail, WebsideProductDetail))('head of an English product page ($tree tree)', ({ C: Component }) => {
  beforeEach(async () => {
    clearNuxtData()
    setTenant({ availableLocales: ['el', 'en'] })
    await useNuxtApp().$i18n.setLocale('en')
  })

  /** Serve the product, and the empty answer to everything else the page asks. */
  function serve(translations: Record<string, unknown>) {
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/products/123': product(translations),
      '/api/products/123/images': [],
      '/api/products/categories/all': [],
      '/api/products/123/*': empty,
      '/api/shipping/policy': [],
      '/api/*': empty,
    })
  }

  afterEach(async () => {
    await useNuxtApp().$i18n.setLocale('el')
  })

  it('is its own canonical, and lists both versions, when it is named in English', async () => {
    serve(makeProduct({ id: 123 }).translations)
    visit('/en/products/123/bluetooth-speaker', 'products-id-slug___en', { id: '123', slug: 'bluetooth-speaker' })

    const head = await headOf(Component)

    expect(head.canonicals).toEqual(['/en/products/123/bluetooth-speaker'])
    expect(head.alternates).toEqual({
      'x-default': '/products/123/bluetooth-speaker',
      'el': '/products/123/bluetooth-speaker',
      'en': '/en/products/123/bluetooth-speaker',
    })
  })

  it('canonicalises to the Greek product, and offers no English version, when it has no English name', async () => {
    serve({ el: makeProduct({ id: 123 }).translations.el })
    visit('/en/products/123/bluetooth-speaker', 'products-id-slug___en', { id: '123', slug: 'bluetooth-speaker' })

    const head = await headOf(Component)

    expect(head.canonicals).toEqual(['/products/123/bluetooth-speaker'])
    expect(head.alternates).toEqual({})
  })
})
