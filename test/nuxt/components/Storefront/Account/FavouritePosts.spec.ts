import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import FavouritePostsPage from '~/components/Storefront/Account/FavouritePosts.vue'
import WebsideFavouritePostsPage from '~/components/variants/webside/Storefront/Account/FavouritePosts.vue'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'

/**
 * The blog posts the shopper liked. One `useFavouritePostsPage` serves
 * both trees: they differ in the page size (12 / 4) and in the cards.
 */
const state = vi.hoisted(() => ({ posts: [] as unknown[], query: undefined as URLSearchParams | undefined, requests: 0 }))

mockNuxtImport('useRoute', () => () => ({ name: 'account-favourites-posts___el', params: {}, query: {}, path: '/account/favourites/posts', fullPath: '/account/favourites/posts', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

/** The frozen tree's list of cards, naming the posts it is given. */
vi.mock('~/components/variants/webside/Blog/Post/Favourites/List.vue', () => ({
  default: defineComponent({
    props: { favourites: { type: Array, required: true } },
    setup(props) {
      return () => h('div', (props.favourites as Array<{ id: number }>).map(post => h('article', { 'data-card': '' }, String(post.id))))
    },
  }),
}))

beforeEach(() => {
  state.posts = [makeBlogPost({ id: 1 }), makeBlogPost({ id: 2 })]
  state.query = undefined
  state.requests = 0
  clearNuxtData(['favourite-posts-7', 'favourite-products-count-7', 'favourite-posts-count-7'])
  registerEndpoint('/api/user/account/7/liked-blog-posts', (event) => {
    state.requests++
    state.query = new URL(event.node.req.url!, 'http://x').searchParams
    return { count: state.posts.length, results: state.posts }
  })
  registerEndpoint('/api/user/account/7/favourite-products', () => ({ count: 0, results: [] }))
})

describe.each(trees(FavouritePostsPage, WebsideFavouritePostsPage))('$tree Storefront/Account/FavouritePosts', ({ tree, C }) => {
  const pageSize = tree === 'default' ? '12' : '4'
  const emptyTitle = () => tree === 'default'
    ? inlineCopy('app/components/Storefront/Account/FavouritePosts.vue').empty.title
    : inlineCopy('app/components/variants/webside/Storefront/Account/FavouritePosts.vue').no_favourites

  async function mountPage() {
    const wrapper = await mountSuspended(C, {
      global: { stubs: { BlogPostCard: { props: ['post'], template: '<article data-card>{{ post.id }}</article>' } } },
    })
    await flushPromises()
    return wrapper
  }

  it('lists the liked posts as the blog cards them', async () => {
    const wrapper = await mountPage()

    await vi.waitFor(() => expect(wrapper.findAll('[data-card]').map(card => card.text())).toEqual(['1', '2']))
  })

  it('asks once for the first page, latest like first, at the tree\'s page size', async () => {
    await mountPage()

    expect(Object.fromEntries(state.query!)).toEqual({ page: '1', pageSize, ordering: '-createdAt' })
    expect(state.requests).toBe(1)
  })

  it('invites a shopper without liked posts to read the blog', async () => {
    state.posts = []

    expect((await mountPage()).text()).toContain(emptyTitle())
  })
})
