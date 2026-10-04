import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import PostsList from '~/components/Blog/Posts/List.vue'
import type { BlogPost } from '~~/shared/openapi/types.gen'
import { makeBlogCategory, makeBlogPost } from '~~/test/fixtures/blog'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The blog index's post list: category pills that filter by URL, the
 * featured post opening the unfiltered first page, a grid of the rest
 * with each post's category named, a numbered pagination, and a kind
 * word where there is nothing to show.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// Reactive, so a test can change the filter on a list that is already mounted.
const state = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return reactive({ query: {} as Record<string, string> })
})
mockNuxtImport('useRoute', () => () => ({
  name: 'blog___el',
  params: {},
  get query() {
    return state.query
  },
  path: '/blog',
  fullPath: '/blog',
  hash: '',
  meta: {},
  matched: [],
}))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

mockComponent('BlogPostCard', {
  props: ['post', 'categoryName'],
  template: '<li data-stub="card" :data-id="post.id" :data-category="categoryName" />',
})
mockComponent('BlogFeaturedPost', {
  props: ['post', 'categoryName'],
  template: '<div data-stub="featured" :data-id="post.id" :data-category="categoryName" />',
})
mockComponent('Pagination', {
  props: ['count', 'page', 'pageSize'],
  template: '<nav data-stub="pagination" :data-count="count" />',
})

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Blog/Posts/List.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const GUIDES = makeBlogCategory({ id: 1, translations: { el: { name: 'Οδηγοί αγοράς', description: '' } }, postCount: 4 })
const CARE = makeBlogCategory({ id: 2, translations: { el: { name: 'Φροντίδα', description: '' } }, postCount: 2 })
const EMPTY = makeBlogCategory({ id: 3, translations: { el: { name: 'Κενή', description: '' } }, postCount: 0 })

const envelope = <T>(results: T[]) => ({
  count: results.length,
  totalPages: 1,
  pageSize: 10,
  page: 1,
  pageTotalResults: results.length,
  links: { next: null, previous: null },
  results,
})

const asked = () => api.callsTo('/api/blog/posts').map(call => call.options.query)

function given(posts: BlogPost[]) {
  api.routes({
    '/api/blog/posts': () => envelope(posts),
    '/api/blog/categories': () => envelope([GUIDES, CARE, EMPTY]),
  })
}

async function mountList() {
  const wrapper = await mountSuspended(PostsList, { route: false })
  await flushPromises()
  return wrapper
}

const ids = (wrapper: VueWrapper, kind: 'card' | 'featured') => wrapper.findAll(`[data-stub="${kind}"]`).map(el => el.attributes('data-id'))
const pills = (wrapper: VueWrapper) => wrapper.findAll('nav[aria-label] a').map(link => [link.text(), link.attributes('href')])

beforeEach(() => {
  state.query = {}
  useState<CursorState>('cursor-state').value = generateInitialCursorState()
  clearNuxtData(['blogPostspageNumber', 'blogCategoryFilter', 'likedBlogPostsundefined'])
  given([
    makeBlogPost({ id: 1, category: 1, createdAt: '2026-09-01T00:00:00Z', featured: true }),
    makeBlogPost({ id: 2, category: 2, createdAt: '2026-09-03T00:00:00Z' }),
    makeBlogPost({ id: 3, category: 1, createdAt: '2026-09-02T00:00:00Z' }),
  ])
})

describe('Blog/Posts/List', () => {
  it('opens with the featured post, then the rest newest first, each with its category named', async () => {
    const wrapper = await mountList()

    expect(ids(wrapper, 'featured')).toEqual(['1'])
    expect(wrapper.get('[data-stub="featured"]').attributes('data-category')).toBe('Οδηγοί αγοράς')
    expect(ids(wrapper, 'card')).toEqual(['2', '3'])
    expect(wrapper.findAll('[data-stub="card"]').map(card => card.attributes('data-category'))).toEqual(['Φροντίδα', 'Οδηγοί αγοράς'])
  })

  it('shows no featured post past the first page, and lists every post in the grid', async () => {
    state.query = { page: '2' }

    const wrapper = await mountList()

    expect(ids(wrapper, 'featured')).toEqual([])
    expect(ids(wrapper, 'card')).toEqual(['2', '3', '1'])
  })

  it.each([
    ['category', { category: '1' }],
    ['search', { search: 'gan' }],
  ])('shows no featured post for a %s filter', async (_name, query) => {
    state.query = query

    const wrapper = await mountList()

    expect(ids(wrapper, 'featured')).toEqual([])
  })

  it('sends the category, the search and the page to the posts route', async () => {
    state.query = { category: '1', search: 'gan', page: '2' }

    await mountList()

    expect(asked()[0]).toMatchObject({ category: '1', search: 'gan', page: '2' })
  })

  it('offers "All" and a pill per category that has posts, each a link to the filtered list', async () => {
    const wrapper = await mountList()

    expect(pills(wrapper)).toEqual([
      [messages.all, '/blog'],
      ['Οδηγοί αγοράς', '/blog?category=1'],
      ['Φροντίδα', '/blog?category=2'],
    ])
  })

  it('keeps the search when a pill is chosen, and goes back to the first page', async () => {
    state.query = { search: 'gan', page: '3' }

    const wrapper = await mountList()

    expect(pills(wrapper)).toEqual([
      [messages.all, '/blog?search=gan'],
      ['Οδηγοί αγοράς', '/blog?search=gan&category=1'],
      ['Φροντίδα', '/blog?search=gan&category=2'],
    ])
  })

  it('marks the pill for the chosen category, and "All" when none is chosen', async () => {
    const all = await mountList()
    expect(all.get('nav a[aria-current="page"]').text()).toBe(messages.all)

    state.query = { category: '2' }
    const chosen = await mountList()
    expect(chosen.get('nav a[aria-current="page"]').text()).toBe('Φροντίδα')
  })

  it('numbers the pages from the total, once, below the posts', async () => {
    const wrapper = await mountList()

    expect(wrapper.findAll('[data-stub="pagination"]')).toHaveLength(1)
    expect(wrapper.get('[data-stub="pagination"]').attributes('data-count')).toBe('3')
  })

  it('says there are no articles yet for a blog with none', async () => {
    given([])

    const wrapper = await mountList()

    expect(wrapper.text()).toContain(messages.empty.title)
    expect(wrapper.find('[data-stub="pagination"]').exists()).toBe(false)
  })

  it('replaces the posts with the empty state when a filter changes on a list already showing posts', async () => {
    const wrapper = await mountList()
    expect(ids(wrapper, 'card')).not.toEqual([])

    given([])
    state.query = { search: 'zzz' }

    await vi.waitFor(() => expect(wrapper.text()).toContain(messages.empty_filtered.title))
    expect(ids(wrapper, 'card')).toEqual([])
    expect(ids(wrapper, 'featured')).toEqual([])
  })

  it('says nothing matches, with a way back to all articles, for a search with no results', async () => {
    state.query = { search: 'zzz' }
    given([])

    const wrapper = await mountList()

    expect(wrapper.text()).toContain(messages.empty_filtered.title)
    expect(wrapper.text()).not.toContain(messages.empty.title)
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toContain('/blog')
  })
})
