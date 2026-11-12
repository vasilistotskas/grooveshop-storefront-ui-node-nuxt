import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { Component } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ProductsGrid from '~/components/PageSection/ProductsGrid.vue'
import ProductsSlider from '~/components/PageSection/ProductsSlider.vue'
import Suggestions from '~/components/Product/Suggestions.vue'
import WebsideProductsGridBand from '~/components/variants/webside/PageSection/ProductsGridBand.vue'
import WebsideProductsSliderBand from '~/components/variants/webside/PageSection/ProductsSliderBand.vue'
import WebsideSuggestions from '~/components/variants/webside/Product/Suggestions.vue'
import { makeProduct, makeProductCard } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'
import { inlineCopy } from '~~/test/helpers/inlineCopy'

/**
 * Every heart asks for its own product's favourite state when it mounts
 * (`useProductFavouriteToggle`), and the user store answers all the hearts
 * of one render with ONE request (`lookUpFavourites`, its own spec in
 * `stores/user.spec.ts`). So the surfaces that never asked (the home's
 * bands and rails, the product page's suggestion strip) show the shopper's
 * favourites, in both designs, without asking for them themselves.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { signedIn } = vi.hoisted(() => ({ signedIn: { value: true } }))
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(signedIn.value),
  user: ref(signedIn.value ? { id: 7 } : null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const LOOKUP = '/api/products/favourites/favourites-by-products'

/** A data setting of products, as the page route hands it over. */
const products = (ids: number[]) => ({
  status: 'ok',
  items: ids.map(id => makeProductCard({ id, slug: `p-${id}`, translations: { el: { name: `Προϊόν ${id}` } } })),
  total: ids.length,
  descriptor: { mode: 'picked', ids },
}) as ResolvedQuery<ProductCard, DataDescriptor<'product'>>

/** The product page's strip: the engine answers products 5 and 6. */
const suggestions = () => ({
  surface: 'pdp',
  impressionId: '0f6d3d3e-6d2b-4c4e-9c2a-2a1f4b6c8d90',
  items: [5, 6].map(id => ({
    product: makeProduct({ id, translations: { el: { name: `Προϊόν ${id}`, description: '', seoTitle: '', seoDescription: '', seoKeywords: '' } } }),
    reason: { strategy: 'category', relationType: null, score: 1 },
  })),
})

/** The favourites the server holds for the shopper (product → favourite). */
const HELD: Record<number, number> = { 2: 20, 5: 50 }

// Embla has no layout here: the carousel renders every slide through its slot.
const STUBS = {
  ImgWithFallback: true,
  ButtonProductAddToCart: true,
  WebsideButtonProductAddToCart: true,
  UCarousel: {
    props: ['items'],
    template: '<div><slot v-for="(item, index) in items" :item="item" :index="index" /></div>',
  },
}

const SURFACES: Array<{ tree: string, band: Component, slider: Component, strip: Component, heart: string }> = [
  { tree: 'default', band: ProductsGrid, slider: ProductsSlider, strip: Suggestions, heart: 'app/components/Button/Product/AddToFavourite.vue' },
  { tree: 'webside', band: WebsideProductsGridBand, slider: WebsideProductsSliderBand, strip: WebsideSuggestions, heart: 'app/components/variants/webside/Button/Product/AddToFavourite.vue' },
]

describe.each(SURFACES)('$tree hearts of a band, a rail and a suggestion strip', ({ band, slider, strip, heart }) => {
  let answer: () => void

  beforeEach(() => {
    setTenant()
    signedIn.value = true
    useUserStore().clearAccountState()
    clearNuxtData()
    api.routes({
      '/api/products/1/recommendations': () => suggestions(),
      // Held until the test lets the server answer.
      [LOOKUP]: (_url: string, options: { body: { productIds: number[] } }) => new Promise((resolve) => {
        answer = () => resolve(options.body.productIds.filter(id => HELD[id]).map(id => ({ id: HELD[id], userId: 7, productId: id, createdAt: '2026-11-12T10:00:00Z' })))
      }),
    })
  })

  /** A home and a product page's strip on one page, as one render. */
  const mountPage = async () => {
    const Page = defineComponent({
      setup: () => () => h('div', [
        h(band, { products: products([1, 2]) }),
        h(slider, { products: products([3, 4]) }),
        h(strip, { surface: 'pdp', seedId: 1 }),
      ]),
    })
    const wrapper = await mountSuspended(Page, { route: false, global: { stubs: STUBS } })
    // The hearts are lazy components (in `<ClientOnly>` on the default card).
    await vi.waitFor(() => expect(wrapper.findAll('[aria-pressed]')).toHaveLength(6))
    await flushPromises()
    return wrapper
  }
  const pressed = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
    wrapper.findAll('[aria-pressed]').map(heart => heart.attributes('aria-pressed'))

  it('asks about every product in one request, and presses the favourites\' hearts once it answers', async () => {
    const wrapper = await mountPage()

    // The render before the answer is the guest's: no heart pressed.
    expect(pressed(wrapper)).not.toContain('true')
    const asked = api.callsTo(LOOKUP).map(call => (call.options as { body: { productIds: number[] } }).body.productIds)
    expect(asked.map(ids => [...ids].sort())).toEqual([[1, 2, 3, 4, 5, 6]])

    answer()
    await flushPromises()

    expect(useUserStore().favouriteProductIds).toEqual({ 2: 20, 5: 50 })
    expect(pressed(wrapper).filter(state => state === 'true')).toHaveLength(2)
  })

  // Each heart is named for its own product (one name in both states, the
  // state in `aria-pressed`), so a list of them tells its products apart.
  it('names each heart for its product', async () => {
    const wrapper = await mountPage()

    const names = wrapper.findAll('[aria-pressed]').map(heart => heart.attributes('aria-label'))
    expect(names.sort()).toEqual([1, 2, 3, 4, 5, 6].map(id => inlineCopy(heart).name.replace('{name}', `Προϊόν ${id}`)))
  })

  it('asks nothing for a guest', async () => {
    signedIn.value = false

    const wrapper = await mountPage()

    expect(api.callsTo(LOOKUP)).toEqual([])
    expect(pressed(wrapper)).not.toContain('true')
  })
})
