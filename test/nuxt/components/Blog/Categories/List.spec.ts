import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import CategoriesList from '~/components/Blog/Categories/List.vue'
import { makeBlogCategory } from '~~/test/fixtures/blog'

/**
 * The blog's category grid: a card per category — its picture, its
 * name as the one link, how many articles it holds — and a numbered
 * pagination below.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const state = vi.hoisted(() => ({ query: {} as Record<string, string> }))
mockNuxtImport('useRoute', () => () => ({ name: 'blog-categories___el', params: {}, query: state.query, path: '/blog/categories', fullPath: '/blog/categories', hash: '', meta: {}, matched: [] }))

mockComponent('Pagination', {
  props: ['count', 'pageSize'],
  template: '<nav data-stub="pagination" :data-count="count" :data-size="pageSize" />',
})

const category = (id: number, name: string, postCount: number) =>
  makeBlogCategory({ id, slug: `kat-${id}`, postCount, translations: { el: { name, description: '' } } })

const envelope = <T>(results: T[]) => ({
  count: results.length,
  totalPages: 1,
  pageSize: 9,
  page: 1,
  pageTotalResults: results.length,
  links: { next: null, previous: null },
  results,
})

function given(results: ReturnType<typeof category>[]) {
  api.routes({ '/api/blog/categories': () => envelope(results) })
}

beforeEach(() => {
  state.query = {}
  clearNuxtData('blogCategories')
  given([category(1, 'Οδηγοί αγοράς', 9), category(2, 'Φροντίδα', 1), category(3, 'Νέα', 0)])
})

async function mountGrid() {
  const wrapper = await mountSuspended(CategoriesList, { route: false, global: { stubs: { ImgWithFallback: true } } })
  await flushPromises()
  return wrapper
}

describe('Blog/Categories/List', () => {
  it('draws a card per category, its name the link to the category', async () => {
    const wrapper = await mountGrid()

    expect(wrapper.findAll('h2 a').map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Οδηγοί αγοράς', '/blog/category/1/kat-1'],
      ['Φροντίδα', '/blog/category/2/kat-2'],
      ['Νέα', '/blog/category/3/kat-3'],
    ])
  })

  it('says how many articles each holds, in the right number', async () => {
    const wrapper = await mountGrid()

    expect(wrapper.findAll('li p').map(line => line.text())).toEqual(['Δες και τα 9 άρθρα', 'Δες το 1 άρθρο', 'Κανένα άρθρο'])
  })

  it('names a category without a slug but does not link it', async () => {
    given([makeBlogCategory({ id: 4, slug: '', translations: { el: { name: 'Χωρίς σύνδεσμο', description: '' } } })])

    const wrapper = await mountGrid()

    expect(wrapper.get('h2').text()).toBe('Χωρίς σύνδεσμο')
    expect(wrapper.find('h2 a').exists()).toBe(false)
  })

  it('numbers the pages from the total, once, below the grid', async () => {
    const wrapper = await mountGrid()

    expect(wrapper.findAll('[data-stub="pagination"]')).toHaveLength(1)
    expect(wrapper.get('[data-stub="pagination"]').attributes('data-count')).toBe('3')
  })

  it('asks for the page in the URL, a grid-sized page, and the page language', async () => {
    state.query = { page: '2' }

    await mountGrid()

    expect(api.callsTo('/api/blog/categories')[0]!.options.query).toMatchObject({ page: '2', pageSize: 9, languageCode: 'el' })
  })

  it('draws no grid and no pagination for a blog without categories', async () => {
    given([])

    const wrapper = await mountGrid()

    expect(wrapper.find('ol').exists()).toBe(false)
    expect(wrapper.find('[data-stub="pagination"]').exists()).toBe(false)
  })
})
