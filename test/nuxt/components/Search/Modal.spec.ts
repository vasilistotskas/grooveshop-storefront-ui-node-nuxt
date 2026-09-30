import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData, useRouter } from '#app'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Component } from 'vue'
import SearchModal from '~/components/Search/Modal.vue'
import WebsideSearchModal from '~/components/variants/webside/Search/Modal.vue'
import {
  makeBlogPostSearchHit,
  makeBlogPostSearchResponse,
  makeProductSearchHit,
  makeProductSearchResponse,
} from '~~/test/fixtures/productFilters'
import { trees } from '~~/test/helpers/trees'

/**
 * The search modal searches as the shopper types — 200 ms after the
 * last keystroke, from two characters — pages through "load more" by
 * APPENDING, and reports which result was clicked at the rank the
 * shopper saw it in its own list. The two trees differ only in the
 * prefix of the result component they render.
 *
 * The modal's body is teleported to `<body>`, so rendered output is read
 * from the document; the component tree is still reachable through the
 * wrapper.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { trackResultClick } = vi.hoisted(() => ({ trackResultClick: vi.fn() }))
mockNuxtImport('useSearchClickTracking', () => () => ({ trackResultClick }))

const DEBOUNCE_MS = 200

const PRODUCTS = [1, 2, 3].map(id => makeProductSearchHit({ id, name: `Προϊόν ${id}` }))
const POSTS = [1, 2].map(id => makeBlogPostSearchHit({ id, title: `Άρθρο ${id}` }))

/** One `/api/search` answer: the given hits, with totals that may promise more. */
const searchResponse = (
  products = PRODUCTS,
  posts = POSTS,
  totals: { products?: number, posts?: number } = {},
) => ({
  products: makeProductSearchResponse({ results: products, estimatedTotalHits: totals.products ?? products.length }),
  blogPosts: makeBlogPostSearchResponse({ results: posts, estimatedTotalHits: totals.posts ?? posts.length }),
})

const own = (wrapper: VueWrapper, key: string, params: Record<string, unknown> = {}): string =>
  (wrapper.vm as unknown as { t: (k: string, p: Record<string, unknown>) => string }).t(key, params)

/** Mount the modal open, with the parent's `v-model:query` loop in place. */
async function openModal(C: Component, query = '') {
  const wrapper = await mountSuspended(C, {
    route: false,
    props: {
      'open': true,
      query,
      'onUpdate:query': (next: string) => wrapper.setProps({ query: next }),
    },
  })
  await flushPromises()
  return wrapper
}

/**
 * The queries `/api/search` received, copied when each request was made:
 * the recorded options hold the component's LIVE query object, which
 * later reads return the current values of.
 */
const sent: Record<string, unknown>[] = []
const answering = (response: (query: Record<string, any>) => unknown) =>
  (_url: string, options: { query: Record<string, unknown> }) => {
    sent.push({ ...options.query })
    return response(options.query)
  }
const optionTitles = () =>
  [...document.querySelectorAll('[role="option"]')].map(o => o.textContent ?? '')

/** A button in the teleported modal, by its visible label. */
function modalButton(label: string): HTMLElement {
  const found = [...document.querySelectorAll('button')].filter(b => b.textContent?.trim() === label)
  expect(found, `expected one "${label}" button`).toHaveLength(1)
  return found[0]!
}

const queryInput = () => document.querySelector<HTMLInputElement>('input[name="queryInput"]')!

async function press(key: string) {
  queryInput().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  await nextTick()
}

describe.each(trees(SearchModal, WebsideSearchModal))('$tree Search/Modal', ({ C }) => {
  beforeEach(() => {
    clearNuxtData()
    localStorage.clear()
    sent.length = 0
    api.routes({
      '/api/search': answering(() => searchResponse()),
      '/api/search/trending': { windowHours: 24, contentType: 'product', languageCode: 'el', results: [] },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('searching', () => {
    it('searches at once for a query it opens with', async () => {
      await openModal(C, 'lap')

      expect(sent).toEqual([{ query: 'lap', languageCode: 'el', limit: 3, offset: 0 }])
    })

    it('does not search for a one-character query', async () => {
      await openModal(C, 'l')

      expect(sent).toEqual([])
    })

    it('searches 200 ms after the shopper stops typing, for the last query only', async () => {
      const wrapper = await openModal(C)
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      await wrapper.setProps({ query: 'ph' })
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 50)
      await wrapper.setProps({ query: 'phone' })
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
      expect(sent).toEqual([])

      await vi.advanceTimersByTimeAsync(1)
      vi.useRealTimers()
      await flushPromises()

      expect(sent).toEqual([expect.objectContaining({ query: 'phone', offset: 0 })])
    })
  })

  describe('results', () => {
    it('lists the products, then the articles, on the "all" tab', async () => {
      await openModal(C, 'lap')

      expect(optionTitles().map(title => title.match(/(Προϊόν|Άρθρο) \d/)?.[0])).toEqual([
        'Προϊόν 1', 'Προϊόν 2', 'Προϊόν 3', 'Άρθρο 1', 'Άρθρο 2',
      ])
    })

    it.each([
      ['products', 'search.tabs.products', 3, ['Προϊόν 1', 'Προϊόν 2', 'Προϊόν 3']],
      ['articles', 'search.tabs.blog_posts', 2, ['Άρθρο 1', 'Άρθρο 2']],
    ] as const)('narrows to the %s on their tab, which counts them', async (_case, key, count, expected) => {
      const wrapper = await openModal(C, 'lap')

      modalButton(own(wrapper, key, { count })).click()
      await nextTick()

      expect(optionTitles().map(title => title.match(/(Προϊόν|Άρθρο) \d/)?.[0])).toEqual(expected)
    })

    it('appends the next page to the results it already shows', async () => {
      api.routes({
        '/api/search': answering(query => query.offset === 0
          ? searchResponse(PRODUCTS, [], { products: 4, posts: 0 })
          : searchResponse([makeProductSearchHit({ id: 4, name: 'Προϊόν 4' })], [], { products: 4, posts: 0 })),
      })
      const wrapper = await openModal(C, 'lap')

      modalButton(own(wrapper, 'search.load_more')).click()
      await flushPromises()

      expect(sent.map(query => query.offset)).toEqual([0, 3])
      expect(optionTitles().map(title => title.match(/Προϊόν \d/)?.[0])).toEqual([
        'Προϊόν 1', 'Προϊόν 2', 'Προϊόν 3', 'Προϊόν 4',
      ])
      expect([...document.querySelectorAll('button')].some(b => b.textContent?.trim() === own(wrapper, 'search.load_more'))).toBe(false)
    })

    it('says so when nothing matches', async () => {
      api.routes({ '/api/search': answering(() => searchResponse([], [])) })

      const wrapper = await openModal(C, 'zzz')

      expect(document.body.textContent).toContain(own(wrapper, 'search.no_results'))
      expect(optionTitles()).toEqual([])
    })
  })

  describe('a result click', () => {
    it('reports a product at its rank and closes the modal', async () => {
      const wrapper = await openModal(C, 'lap')

      ;(document.querySelectorAll('[role="option"]')[1] as HTMLElement).click()
      await nextTick()

      expect(trackResultClick).toHaveBeenCalledExactlyOnceWith({
        queryId: makeProductSearchResponse().queryId,
        resultId: 2,
        resultType: 'product',
        position: 1,
      })
      expect(wrapper.emitted('update:open')).toEqual([[false]])
    })

    it('reports an article at its rank among the articles, not behind the products', async () => {
      await openModal(C, 'lap')

      ;(document.querySelectorAll('[role="option"]')[4] as HTMLElement).click()
      await nextTick()

      expect(trackResultClick).toHaveBeenCalledExactlyOnceWith({
        queryId: makeBlogPostSearchResponse().queryId,
        resultId: 2,
        resultType: 'blog_post',
        position: 1,
      })
    })
  })

  it('opens the full results page from "view all", remembering the query', async () => {
    const replace = vi.spyOn(useRouter(), 'replace').mockResolvedValue(undefined)
    const wrapper = await openModal(C, 'laptop')

    modalButton(own(wrapper, 'search.view_all_results')).click()
    await nextTick()

    expect(replace).toHaveBeenCalledExactlyOnceWith({ path: '/search', query: { query: 'laptop' } })
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(JSON.parse(localStorage.getItem('search:recent:el')!)).toEqual(['laptop'])
  })

  it('moves the active result with the arrow keys, wrapping at both ends', async () => {
    await openModal(C, 'lap')
    queryInput().focus()
    const active = () => queryInput().getAttribute('aria-activedescendant')

    expect(active()).toBeNull()
    await press('ArrowUp')
    expect(active()).toBe('search-result-4')
    await press('ArrowDown')
    expect(active()).toBe('search-result-0')
    await press('ArrowDown')
    expect(active()).toBe('search-result-1')
    expect(document.getElementById('search-result-1')?.getAttribute('aria-selected')).toBe('true')
  })

  it('offers the shopper\'s recent searches before a query is typed', async () => {
    localStorage.setItem('search:recent:el', JSON.stringify(['κινητό']))
    const wrapper = await openModal(C)
    expect(document.body.textContent).toContain(own(wrapper, 'search.recent'))

    modalButton('κινητό').click()
    await nextTick()

    expect(wrapper.emitted('update:query')).toEqual([['κινητό']])
  })
})
