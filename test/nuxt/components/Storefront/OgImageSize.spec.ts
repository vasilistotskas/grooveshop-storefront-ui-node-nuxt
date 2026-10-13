import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Component } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { injectHead } from '#imports'
import ProductsCategory from '~/components/Storefront/ProductsCategory.vue'
import WebsideProductsCategory from '~/components/variants/webside/Storefront/ProductsCategory.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A page that sets its own og:image states the size of the 1200x630
 * rendition it asked the media service for, and states nothing for the
 * tenant-logo fallback, whose size is unknown. @nuxtjs/seo 6 no longer
 * fills og:image:width/height from a site default, so a page that omits
 * them ships an image with no size.
 */
const state = vi.hoisted(() => ({ products: [] as Array<{ mainImagePath: string }> }))

mockNuxtImport('useRoute', () => () => ({ name: 'products-category-id-slug___el', params: { id: '7', slug: 'kafes' }, query: {}, path: '/products/category/7/kafes', fullPath: '/products/category/7/kafes', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useCategoryForest', () => () => ({ forest: ref([]), trail: ref([]) }))
mockNuxtImport('useApi', () => (url: string) => ({
  data: ref(url.endsWith('/categories/7')
    ? { id: 7, slug: 'kafes', translations: { el: { name: 'Καφές', description: '' } } }
    : { results: state.products }),
  error: ref(null),
}))

const STUBS = ['PageBreadcrumb', 'ProductsHeader', 'ProductsCategoryChips', 'ProductsBrowse', 'WebsidePageWrapper', 'WebsidePageTitle', 'WebsideProductsList']

async function ogMeta(component: Component) {
  const head = injectHead()
  const before = new Set(head.entries.keys())
  const wrapper = await mountSuspended(component, {
    route: false,
    global: { stubs: Object.fromEntries(STUBS.map(name => [name, true])) },
  })
  await flushPromises()
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    head.render()
    vi.runOnlyPendingTimers()
  }
  finally {
    vi.useRealTimers()
  }
  const read = (property: string) => document.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ?? null
  const painted = { image: read('og:image'), width: read('og:image:width'), height: read('og:image:height') }
  wrapper.unmount()
  for (const key of head.entries.keys()) {
    if (!before.has(key)) head.entries.delete(key)
  }
  return painted
}

describe.each([
  ['default', ProductsCategory],
  ['webside', WebsideProductsCategory],
])('ProductsCategory (%s) og:image size', (_name, component) => {
  beforeEach(() => {
    setTenant({ logoLightUrl: 'https://shop.test/logo.png', isPlatformStorefront: false })
  })

  it('states 1200x630 when the og:image is the rendition of the first product', async () => {
    state.products = [{ mainImagePath: 'media/uploads/products/a.png' }]

    const og = await ogMeta(component)

    expect(og.image).toContain('1200/630')
    expect(og.width).toBe('1200')
    expect(og.height).toBe('630')
  })

  it('states no size when the og:image is the tenant logo', async () => {
    state.products = []

    const og = await ogMeta(component)

    expect(og.image).toBe('https://shop.test/logo.png')
    expect(og.width).toBeNull()
    expect(og.height).toBeNull()
  })
})
