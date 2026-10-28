import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import FavouriteProductsPage from '~/components/Storefront/Account/FavouriteProducts.vue'
import WebsideFavouriteProductsPage from '~/components/variants/webside/Storefront/Account/FavouriteProducts.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from '~~/test/fixtures/product'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The saved products. Every one is a favourite, so the hearts are
 * primed from the list itself — on the server too — and removing one
 * reloads the list. One `useFavouriteProductsPage` serves both trees: they
 * differ in the page size (12 / 8), in the cards and in how a removal
 * reaches the page (the shop's card emits `favourite-delete`; the webside
 * list emits `refresh-favourites`).
 */
const state = vi.hoisted(() => ({ favourites: [] as unknown[], query: undefined as URLSearchParams | undefined }))

mockNuxtImport('useRoute', () => () => ({ name: 'account-favourites-products___el', params: {}, query: {}, path: '/account/favourites/products', fullPath: '/account/favourites/products', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

/** The webside design's list of cards: it names the products and reports a removal as the real one does. */
vi.mock('~/components/variants/webside/Product/Favourites/List.vue', () => ({
  default: defineComponent({
    props: { favourites: { type: Array, required: true } },
    emits: ['refresh-favourites'],
    setup(props, { emit }) {
      return () => h('div', (props.favourites as Array<{ product: { id: number } }>).map(favourite =>
        h('button', { 'data-card': '', 'onClick': () => emit('refresh-favourites') }, String(favourite.product.id))))
    },
  }),
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

/** The shop's card is covered by its spec; here it only names the product and reports a removal. */
const CardStub = defineComponent({
  props: { product: { type: Object, required: true } },
  emits: ['favourite-delete'],
  setup(props, { emit }) {
    return () => h('button', { 'data-card': '', 'onClick': () => emit('favourite-delete', 1) }, String((props.product as { id: number }).id))
  },
})

beforeEach(() => {
  setTenant()
  fetches = 0
  countFetches = 0
  state.query = undefined
  state.favourites = [favourite(11, 101), favourite(12, 102)]
  clearNuxtData(['favourite-products-7', 'favourite-products-count-7', 'favourite-posts-count-7'])
  registerEndpoint('/api/user/account/7/favourite-products', (event) => {
    const query = new URL(event.node.req.url!, 'http://x').searchParams
    if (query.get('pageSize') === '1') countFetches++
    else {
      fetches++
      state.query = query
    }
    return { count: state.favourites.length, results: state.favourites }
  })
  registerEndpoint('/api/user/account/7/liked-blog-posts', () => ({ count: 0, results: [] }))
})

describe.each(trees(FavouriteProductsPage, WebsideFavouriteProductsPage))('$tree Storefront/Account/FavouriteProducts', ({ tree, C, own }) => {
  const pageSize = tree === 'default' ? '12' : '8'
  // The shop's empty state is its own words; the webside one says the global `empty.title`.
  const emptyTitle = () => tree === 'default' ? inlineCopy('app/components/Storefront/Account/FavouriteProducts.vue').empty.title : useNuxtApp().$i18n.t('empty.title')

  async function mountPage() {
    const wrapper = await mountSuspended(C, { global: { stubs: { ProductCard: CardStub, [own('ProductCard')]: CardStub } } })
    await flushPromises()
    return wrapper
  }

  it('lists the saved products as cards', async () => {
    const wrapper = await mountPage()

    await vi.waitFor(() => expect(wrapper.findAll('[data-card]').map(card => card.text())).toEqual(['101', '102']))
  })

  it('asks for the first page, newest first, at the tree\'s page size', async () => {
    await mountPage()

    expect(Object.fromEntries(state.query!)).toEqual({ page: '1', pageSize, ordering: '-createdAt' })
  })

  it('primes every heart from the list itself', async () => {
    await mountPage()
    const { getFavouriteIdByProductId } = useUserStore()

    expect([getFavouriteIdByProductId(101), getFavouriteIdByProductId(102)]).toEqual([11, 12])
  })

  it('reloads the list, and the tabs\' count where the page has tabs, when a product is removed', async () => {
    const wrapper = await mountPage()
    await vi.waitFor(() => expect(wrapper.find('[data-card]').exists()).toBe(true))
    const [listBefore, countBefore] = [fetches, countFetches]

    await wrapper.get('[data-card]').trigger('click')
    await flushPromises()

    // Only the shop's page shows a count (its tabs); the webside navbar has none to reload.
    expect([fetches, countFetches]).toEqual([listBefore + 1, countBefore + (tree === 'default' ? 1 : 0)])
  })

  it('asks for no saved product, list or count, on a store without the catalogue', async () => {
    setTenantFeatures({ catalogue: false })

    await mountPage()

    expect([fetches, countFetches]).toEqual([0, 0])
  })

  it('invites a shopper without favourites to browse', async () => {
    state.favourites = []

    expect((await mountPage()).text()).toContain(emptyTitle())
  })
})
