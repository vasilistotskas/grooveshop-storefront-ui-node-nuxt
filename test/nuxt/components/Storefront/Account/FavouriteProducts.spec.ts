import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import FavouriteProductsPage from '~/components/Storefront/Account/FavouriteProducts.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from '~~/test/fixtures/product'

/**
 * The saved products as the shop's cards. Every one is a favourite, so
 * the hearts are primed from the list itself — on the server too — and
 * removing one reloads the list.
 */
const state = vi.hoisted(() => ({ favourites: [] as unknown[] }))

mockNuxtImport('useRoute', () => () => ({ name: 'account-favourites-products___el', params: {}, query: {}, path: '/account/favourites/products', fullPath: '/account/favourites/products', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const favourite = (id: number, productId: number) => ({
  id,
  userId: 7,
  userUsername: 'demo',
  product: makeProduct({ id: productId }),
  createdAt: FIXTURE_TIMESTAMP,
  uuid: fixtureUuid(30, id),
})

let fetches = 0
let countFetches = 0

/** The card is the shop's own, covered by its spec; here it only names the product and reports a removal. */
const CardStub = defineComponent({
  props: { product: { type: Object, required: true } },
  emits: ['favourite-delete'],
  setup(props, { emit }) {
    return () => h('button', { 'data-card': '', 'onClick': () => emit('favourite-delete', 1) }, String((props.product as { id: number }).id))
  },
})

beforeEach(() => {
  fetches = 0
  countFetches = 0
  state.favourites = [favourite(11, 101), favourite(12, 102)]
  clearNuxtData(['favourite-products-7', 'favourite-products-count-7', 'favourite-posts-count-7'])
  registerEndpoint('/api/user/account/7/favourite-products', (event) => {
    if (new URL(event.node.req.url!, 'http://x').searchParams.get('pageSize') === '1') countFetches++
    else fetches++
    return { count: state.favourites.length, results: state.favourites }
  })
  registerEndpoint('/api/user/account/7/liked-blog-posts', () => ({ count: 0, results: [] }))
})

async function mountPage() {
  const wrapper = await mountSuspended(FavouriteProductsPage, { global: { stubs: { ProductCard: CardStub } } })
  await flushPromises()
  return wrapper
}

describe('Storefront/Account/FavouriteProducts', () => {
  it('lists the saved products as cards', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('[data-card]').map(card => card.text())).toEqual(['101', '102'])
  })

  it('primes every heart from the list itself', async () => {
    await mountPage()
    const { getFavouriteIdByProductId } = useUserStore()

    expect([getFavouriteIdByProductId(101), getFavouriteIdByProductId(102)]).toEqual([11, 12])
  })

  it('reloads the list and the tab\'s count when a product is removed', async () => {
    const wrapper = await mountPage()
    const [listBefore, countBefore] = [fetches, countFetches]

    await wrapper.get('[data-card]').trigger('click')
    await flushPromises()

    expect([fetches, countFetches]).toEqual([listBefore + 1, countBefore + 1])
  })

  it('invites a shopper without favourites to browse', async () => {
    state.favourites = []

    expect((await mountPage()).text()).toContain('Κανένα αγαπημένο προϊόν ακόμα')
  })
})
