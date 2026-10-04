import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, onErrorCaptured } from 'vue'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import BlogCategory from '~/components/Storefront/BlogCategory.vue'
import type { BlogPost } from '~~/shared/openapi/types.gen'
import { makeBlogCategory, makeBlogPost } from '~~/test/fixtures/blog'
import { failWith } from '~~/test/helpers/api'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * A blog category's page: Blog › Categories › name, the name with how
 * many posts it holds, the sort control, the posts in a grid with the
 * category named on each, a numbered pagination, and a word for a
 * category with nothing in it yet.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const state = vi.hoisted(() => ({ query: {} as Record<string, string> }))
mockNuxtImport('useRoute', () => () => ({ name: 'blog-category-id-slug___el', params: { id: '4', slug: 'odigoi' }, query: state.query, path: '/blog/category/4/odigoi', fullPath: '/blog/category/4/odigoi', hash: '', meta: {}, matched: [] }))

mockComponent('BlogPostCard', {
  props: ['post', 'categoryName'],
  template: '<li data-stub="card" :data-id="post.id" :data-category="categoryName" />',
})
mockComponent('Pagination', {
  props: ['count'],
  template: '<nav data-stub="pagination" :data-count="count" />',
})
mockComponent('Ordering', { template: '<div data-stub="ordering" />' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/BlogCategory.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const CATEGORY = makeBlogCategory({ id: 4, slug: 'odigoi', postCount: 9, translations: { el: { name: 'Οδηγοί αγοράς', description: 'Όλοι οι οδηγοί.' } } })

const envelope = (results: BlogPost[]) => ({
  count: results.length,
  totalPages: 1,
  pageSize: 15,
  page: 1,
  pageTotalResults: results.length,
  links: { next: null, previous: null },
  results,
})

function given(posts: BlogPost[]) {
  api.routes({
    '/api/blog/categories/4': () => CATEGORY,
    '/api/blog/categories/4/posts': () => envelope(posts),
  })
}

beforeEach(() => {
  state.query = {}
  clearNuxtData(['blogCategory4', 'blogCategoryPosts4'])
  given([makeBlogPost({ id: 1, category: 4 }), makeBlogPost({ id: 2, category: 4 })])
})

async function mountPage() {
  const wrapper = await mountSuspended(BlogCategory, { route: false })
  await flushPromises()
  return wrapper
}

describe('Storefront/BlogCategory', () => {
  it('names the category in the h1 with how many posts it holds, under Blog › Categories', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('h1').text()).toBe('Οδηγοί αγοράς(9)')
    const crumbs = wrapper.findAll('nav a').map(link => [link.text(), link.attributes('href')])
    expect(crumbs).toContainEqual([messages.breadcrumb.items.blog.label, '/blog'])
    expect(crumbs).toContainEqual([messages.breadcrumb.items.blog.categories.label, '/blog/categories'])
  })

  it('lists the posts, each with the category named, and numbers the pages', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('[data-stub="card"]').map(card => [card.attributes('data-id'), card.attributes('data-category')])).toEqual([
      ['1', 'Οδηγοί αγοράς'],
      ['2', 'Οδηγοί αγοράς'],
    ])
    expect(wrapper.get('[data-stub="pagination"]').attributes('data-count')).toBe('2')
    expect(wrapper.find('[data-stub="ordering"]').exists()).toBe(true)
  })

  it('asks for the page, the sort and the language from the posts route', async () => {
    state.query = { page: '2', ordering: 'createdAt' }

    await mountPage()

    expect(api.callsTo('/api/blog/categories/4/posts')[0]!.options.query).toMatchObject({ page: '2', ordering: 'createdAt', languageCode: 'el' })
  })

  it('says the category has no articles yet, with a way to all of them, and numbers no pages', async () => {
    given([])

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(messages.empty.title)
    expect(wrapper.text()).toContain(messages.empty.description)
    expect(wrapper.findAll('a').map(link => link.attributes('href'))).toContain('/blog')
    expect(wrapper.find('[data-stub="card"]').exists()).toBe(false)
    expect(wrapper.find('[data-stub="pagination"]').exists()).toBe(false)
  })

  it('is a 404 for a category that does not exist', async () => {
    api.routes({ '/api/blog/categories/4': failWith(404) })
    let captured: unknown
    const Parent = defineComponent({
      setup() {
        onErrorCaptured((error) => {
          captured ??= error
          return false
        })
        return () => h(BlogCategory)
      },
    })

    await mountSuspended(Parent, { route: false })
    await flushPromises()

    expect(captured).toMatchObject({ statusCode: 404 })
  })
})
