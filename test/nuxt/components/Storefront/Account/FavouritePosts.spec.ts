import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import FavouritePostsPage from '~/components/Storefront/Account/FavouritePosts.vue'
import { makeBlogPost } from '~~/test/fixtures/blog'

/** The blog posts the shopper liked, as the blog lists them. */
const state = vi.hoisted(() => ({ posts: [] as unknown[] }))

mockNuxtImport('useRoute', () => () => ({ name: 'account-favourites-posts___el', params: {}, query: {}, path: '/account/favourites/posts', fullPath: '/account/favourites/posts', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

beforeEach(() => {
  state.posts = [makeBlogPost({ id: 1 }), makeBlogPost({ id: 2 })]
  clearNuxtData(['favourite-posts-7', 'favourite-products-count-7', 'favourite-posts-count-7'])
  registerEndpoint('/api/user/account/7/liked-blog-posts', () => ({ count: state.posts.length, results: state.posts }))
  registerEndpoint('/api/user/account/7/favourite-products', () => ({ count: 0, results: [] }))
})

async function mountPage() {
  const wrapper = await mountSuspended(FavouritePostsPage, {
    global: { stubs: { BlogPostCard: { props: ['post'], template: '<article data-card>{{ post.id }}</article>' } } },
  })
  await flushPromises()
  return wrapper
}

describe('Storefront/Account/FavouritePosts', () => {
  it('lists the liked posts as the blog cards them', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('[data-card]').map(card => card.text())).toEqual(['1', '2'])
  })

  it('invites a shopper without liked posts to read the blog', async () => {
    state.posts = []

    expect((await mountPage()).text()).toContain('Κανένα αγαπημένο άρθρο ακόμα')
  })
})
