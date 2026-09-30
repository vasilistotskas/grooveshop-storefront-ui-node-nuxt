import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import SearchInput from '~/components/Products/Filters/SearchInput.vue'
import WebsideSearchInput from '~/components/variants/webside/Products/Filters/SearchInput.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * Typing writes the search to the URL once the shopper pauses (300 ms),
 * not per keystroke — each write is a navigation and a new search
 * request. The box also follows the URL, so back/forward shows the
 * search the results belong to.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const DEBOUNCE_MS = 300

const own = (wrapper: VueWrapper, key: string): string =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

describe.each(trees(SearchInput, WebsideSearchInput))('$tree Products/Filters/SearchInput', ({ C }) => {
  beforeEach(() => {
    pf.reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts from the search in the URL', async () => {
    pf.filters.value.search = 'laptop'

    const wrapper = await mountSuspended(C, { route: false })

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('laptop')
  })

  it('writes the search to the URL once typing pauses, with the last value only', async () => {
    const wrapper = await mountSuspended(C, { route: false })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const input = wrapper.find('input')

    await input.setValue('lap')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 100)
    await input.setValue('laptop')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
    expect(pf.updateFilters).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)

    expect(pf.updateFilters).toHaveBeenCalledExactlyOnceWith({ search: 'laptop' })
  })

  it('offers a clear button only with text in the box, and clearing drops the search', async () => {
    const wrapper = await mountSuspended(C, { route: false })
    const clearSelector = `button[aria-label="${own(wrapper, 'clear')}"]`
    expect(wrapper.find(clearSelector).exists()).toBe(false)

    await wrapper.find('input').setValue('laptop')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await wrapper.find(clearSelector).trigger('click')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(pf.updateFilters).toHaveBeenLastCalledWith({ search: '' })
    expect(wrapper.find(clearSelector).exists()).toBe(false)
  })

  it('follows the URL when the search changes elsewhere', async () => {
    pf.filters.value.search = 'laptop'
    const wrapper = await mountSuspended(C, { route: false })

    pf.filters.value.search = 'phone'
    await nextTick()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('phone')
  })
})
