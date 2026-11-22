import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Component } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { injectHead } from '#imports'
import ProductsCategory from '~/components/Storefront/ProductsCategory.vue'
import WebsideProductsCategory from '~/components/variants/webside/Storefront/ProductsCategory.vue'
import { setTenant } from '~~/test/helpers/tenant'
import { OG_IMAGE_BOX } from '~~/shared/constants'

/**
 * A product category's og:image is the first product's social-card
 * rendition, or the tenant logo. Neither states a size: a search result
 * carries no image size, and the logo's is unknown, so no size is truer
 * than the box asked for, which the media service serves smaller when the
 * photo is.
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

  it('states no size for the rendition of the first product', async () => {
    state.products = [{ mainImagePath: 'media/uploads/products/a.png' }]

    const og = await ogMeta(component)

    expect(og.image).toContain(`${OG_IMAGE_BOX.width}/${OG_IMAGE_BOX.height}`)
    expect(og.width).toBeNull()
    expect(og.height).toBeNull()
  })

  it('states no size when the og:image is the tenant logo', async () => {
    state.products = []

    const og = await ogMeta(component)

    expect(og.image).toBe('https://shop.test/logo.png')
    expect(og.width).toBeNull()
    expect(og.height).toBeNull()
  })
})
