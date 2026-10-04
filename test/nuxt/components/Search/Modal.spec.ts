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

/**
 * The default modal is a command palette (the second suite below); the
 * frozen webside copy keeps the original modal, tabs and all, so its body
 * is run on its own first. Both search as the shopper types — 200 ms after the
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

describe('Webside Search/Modal', () => {
  const C = WebsideSearchModal

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

/**
 * The redesigned palette: a `UCommandPalette` in a modal, with Products,
 * Guides and Recent searches groups. The tabs and "load more" went with
 * the redesign; "see all" opens the full results page.
 */
describe('Search/Modal (palette)', () => {
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

  const options = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')]
  const optionTexts = () => options().map(option => option.textContent?.replace(/\s+/g, ' ').trim() ?? '')
  // The currency format uses a no-break space; the option text is whitespace-normalised.
  const eur = (value: number) => useNuxtApp().$i18n.n(value, 'currency').replace(/\s+/g, ' ')

  describe('searching', () => {
    it('searches at once for a query it opens with', async () => {
      await openModal(SearchModal, 'lap')

      expect(sent).toEqual([{ query: 'lap', languageCode: 'el', limit: 3, offset: 0 }])
    })

    it('does not search for a one-character query', async () => {
      await openModal(SearchModal, 'l')

      expect(sent).toEqual([])
    })

    it('searches 200 ms after the shopper stops typing, for the last query only', async () => {
      const wrapper = await openModal(SearchModal)
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
    it('lists the products, then the guides, each under its own heading', async () => {
      await openModal(SearchModal, 'lap')

      expect(optionTexts().map(text => text.match(/(Προϊόν|Άρθρο) \d/)?.[0])).toEqual([
        'Προϊόν 1', 'Προϊόν 2', 'Προϊόν 3', 'Άρθρο 1', 'Άρθρο 2',
      ])
      expect(document.body.textContent).toContain('Προϊόντα')
      expect(document.body.textContent).toContain('Οδηγοί')
    })

    it('links each result to its page, in the page language', async () => {
      await openModal(SearchModal, 'lap')

      const hrefs = options().map(option => option.getAttribute('href') ?? option.querySelector('a')?.getAttribute('href'))
      expect(hrefs.map(href => href?.split('/')[1])).toEqual(['products', 'products', 'products', 'blog', 'blog'])
      expect(hrefs[0]).toContain('/1')
      expect(hrefs[4]).toContain('/2')
    })

    it('shows a product\'s price, and its discount only when it has one', async () => {
      api.routes({
        '/api/search': answering(() => searchResponse([
          makeProductSearchHit({ id: 1, name: 'Προϊόν 1', finalPrice: 41.5, discountPercent: 15 }),
          makeProductSearchHit({ id: 2, name: 'Προϊόν 2', finalPrice: 27.9, discountPercent: 0 }),
        ], [])),
      })

      await openModal(SearchModal, 'lap')

      expect(optionTexts()[0]).toContain(eur(41.5))
      expect(optionTexts()[0]).toContain('−15%')
      expect(optionTexts()[1]).toContain(eur(27.9))
      expect(optionTexts()[1]).not.toContain('%')
    })

    it('marks the words the shopper typed in a title, without reading the title as markup', async () => {
      api.routes({
        '/api/search': answering(() => searchResponse([
          makeProductSearchHit({ id: 1, name: 'Power bank <b>20,000</b>mAh' }),
        ], [])),
      })

      await openModal(SearchModal, 'power')

      expect([...document.querySelectorAll('mark')].map(mark => mark.textContent)).toEqual(['Power'])
      expect(document.querySelector('[role="option"] b')).toBeNull()
    })

    it('says so when nothing matches', async () => {
      api.routes({ '/api/search': answering(() => searchResponse([], [])) })

      await openModal(SearchModal, 'zzz')

      expect(document.body.textContent).toContain('Δεν βρέθηκαν αποτελέσματα')
      expect(options()).toEqual([])
    })

    it('says what it searched for when the engine relaxed the query', async () => {
      api.routes({
        '/api/search': answering(() => ({
          products: makeProductSearchResponse({ results: PRODUCTS, estimatedTotalHits: 3, relaxedQuery: 'power' }),
          blogPosts: makeBlogPostSearchResponse({ results: [], estimatedTotalHits: 0 }),
        })),
      })

      await openModal(SearchModal, 'powr bnk')

      expect(document.body.textContent).toContain('Εμφανίζονται αποτελέσματα για "power"')
    })
  })

  describe('a result click', () => {
    it('reports a product at its rank, closes the palette and remembers the query', async () => {
      const wrapper = await openModal(SearchModal, 'lap')

      options()[1]!.click()
      await nextTick()

      expect(trackResultClick).toHaveBeenCalledExactlyOnceWith({
        queryId: makeProductSearchResponse().queryId,
        resultId: 2,
        resultType: 'product',
        position: 1,
      })
      expect(wrapper.emitted('update:open')).toEqual([[false]])
      expect(JSON.parse(localStorage.getItem('search:recent:el')!)).toEqual(['lap'])
    })

    it('reports a guide at its rank among the guides, not behind the products', async () => {
      await openModal(SearchModal, 'lap')

      options()[4]!.click()
      await nextTick()

      expect(trackResultClick).toHaveBeenCalledExactlyOnceWith({
        queryId: makeBlogPostSearchResponse().queryId,
        resultId: 2,
        resultType: 'blog_post',
        position: 1,
      })
    })
  })

  describe('see all', () => {
    it('opens the full results page, remembering the query', async () => {
      const replace = vi.spyOn(useRouter(), 'replace').mockResolvedValue(undefined)
      const wrapper = await openModal(SearchModal, 'laptop')

      modalButton('Δες και τα 5 αποτελέσματα').click()
      await nextTick()

      expect(replace).toHaveBeenCalledExactlyOnceWith({ path: '/search', query: { query: 'laptop' } })
      expect(wrapper.emitted('update:open')).toEqual([[false]])
      expect(JSON.parse(localStorage.getItem('search:recent:el')!)).toEqual(['laptop'])
    })

    it('is not offered when the search found nothing', async () => {
      api.routes({ '/api/search': answering(() => searchResponse([], [])) })

      await openModal(SearchModal, 'zzz')

      expect([...document.querySelectorAll('button')].some(button => button.textContent?.includes('αποτελέσματα'))).toBe(false)
    })
  })

  describe('before a query', () => {
    it('offers the shopper\'s recent searches, and a click searches again', async () => {
      localStorage.setItem('search:recent:el', JSON.stringify(['κινητό']))
      const wrapper = await openModal(SearchModal)
      expect(document.body.textContent).toContain('Πρόσφατες αναζητήσεις')

      options().find(option => option.textContent?.includes('κινητό'))!.click()
      await nextTick()

      expect(wrapper.emitted('update:query')).toEqual([['κινητό']])
    })

    it('keeps the recent searches beside the results', async () => {
      localStorage.setItem('search:recent:el', JSON.stringify(['κινητό']))

      await openModal(SearchModal, 'lap')

      expect(optionTexts().at(-1)).toContain('κινητό')
    })

    it('offers what the shop is searching for, and a click searches for it', async () => {
      api.routes({
        '/api/search/trending': { windowHours: 24, contentType: 'product', languageCode: 'el', results: [{ query: 'φορτιστής', count: 9 }] },
      })
      const wrapper = await openModal(SearchModal)
      await vi.waitFor(() => expect(document.body.textContent).toContain('Δημοφιλείς αναζητήσεις'))

      options().find(option => option.textContent?.includes('φορτιστής'))!.click()
      await nextTick()

      expect(wrapper.emitted('update:query')).toEqual([['φορτιστής']])
    })

    it('asks the shopper to start typing when there is nothing to offer', async () => {
      await openModal(SearchModal)

      expect(document.body.textContent).toContain('Ξεκίνα να πληκτρολογείς για αναζήτηση')
    })
  })
})
