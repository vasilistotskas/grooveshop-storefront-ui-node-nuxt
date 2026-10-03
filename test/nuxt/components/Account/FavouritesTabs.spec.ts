import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import AccountFavouritesTabs from '~/components/Account/FavouritesTabs.vue'

/**
 * The favourites pages' tabs: links to the saved products and posts, each
 * with its total (one row of each list asked for), the page on screen
 * marked current.
 */
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const asked: Record<string, unknown[]> = { products: [], posts: [] }

beforeEach(() => {
  asked.products = []
  asked.posts = []
  clearNuxtData(['favourite-products-count-7', 'favourite-posts-count-7'])
  registerEndpoint('/api/user/account/7/favourite-products', (event) => {
    asked.products!.push(new URL(event.node.req.url!, 'http://x').searchParams.get('pageSize'))
    return { count: 6, results: [] }
  })
  registerEndpoint('/api/user/account/7/liked-blog-posts', (event) => {
    asked.posts!.push(new URL(event.node.req.url!, 'http://x').searchParams.get('pageSize'))
    return { count: 2, results: [] }
  })
})

describe('Account/FavouritesTabs', () => {
  it('links both lists with their totals', async () => {
    const wrapper = await mountSuspended(AccountFavouritesTabs, { props: { current: 'products' } })
    const localePath = useLocalePath()

    expect(wrapper.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Προϊόντα 6', localePath('account-favourites-products')],
      ['Άρθρα 2', localePath('account-favourites-posts')],
    ])
    expect(asked).toEqual({ products: ['1'], posts: ['1'] })
  })

  it.each([
    ['products', 0],
    ['posts', 1],
  ] as const)('marks the %s tab as the page on screen', async (current, index) => {
    const wrapper = await mountSuspended(AccountFavouritesTabs, { props: { current } })

    expect(wrapper.findAll('a').map(link => link.attributes('aria-current'))).toEqual(
      [0, 1].map(position => (position === index ? 'page' : undefined)),
    )
  })
})
