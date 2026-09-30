import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import PopularityFilter from '~/components/Products/Filters/PopularityFilter.vue'
import WebsidePopularityFilter from '~/components/variants/webside/Products/Filters/PopularityFilter.vue'
import { makeProductSearchResponse } from '~~/test/fixtures/productFilters'
import { trees } from '~~/test/helpers/trees'

/**
 * The minimum-likes slider takes its bounds from the catalogue's
 * `likes_count` facet and writes `likesMin` to the URL on release only.
 * A minimum dragged back to the catalogue's own minimum is no filter,
 * so it goes as `undefined`.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const withLikes = (min: number, max: number) =>
  makeProductSearchResponse({ facetStats: { likesCount: { min, max } } })

const slider = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'USlider' })

/** Reka owns the pointer handling; drive USlider's documented events. */
async function dragAndRelease(wrapper: VueWrapper, value?: number) {
  if (value !== undefined) slider(wrapper).vm.$emit('update:modelValue', value)
  slider(wrapper).vm.$emit('change')
  await nextTick()
}

describe.each(trees(PopularityFilter, WebsidePopularityFilter))('$tree Products/Filters/PopularityFilter', ({ C }) => {
  beforeEach(() => {
    clearNuxtData()
    pf.reset()
    api.routes({ '/api/products/search': withLikes(0, 250) })
  })

  it('asks the search for the likes facet alone, in the page locale', async () => {
    await mountSuspended(C, { route: false })

    expect(api.callsTo('/api/products/search')).toEqual([{
      url: '/api/products/search',
      options: expect.objectContaining({ query: { facets: 'likes_count', limit: 1, languageCode: 'el' } }),
    }])
  })

  it('spans the catalogue\'s likes and starts at its minimum with no filter set', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    expect(slider(wrapper).props()).toMatchObject({ min: 0, max: 250, modelValue: 0 })
    expect(wrapper.text()).toContain('0+')
  })

  it('starts at the minimum from the URL', async () => {
    pf.filters.value.likesMin = 40

    const wrapper = await mountSuspended(C, { route: false })

    expect(slider(wrapper).props('modelValue')).toBe(40)
    expect(wrapper.text()).toContain('40+')
  })

  it('shows a skeleton when every product has the same number of likes', async () => {
    api.routes({ '/api/products/search': withLikes(3, 3) })

    const wrapper = await mountSuspended(C, { route: false })

    expect(slider(wrapper).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
  })

  it('writes the dragged minimum on release', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    slider(wrapper).vm.$emit('update:modelValue', 12)
    await nextTick()
    expect(wrapper.text()).toContain('12+')
    expect(pf.updateFilters).not.toHaveBeenCalled()
    await dragAndRelease(wrapper)

    expect(pf.updateFilters.mock.calls).toStrictEqual([[{ likesMin: 12 }]])
  })

  it('sends a minimum dragged back to the catalogue minimum as no filter', async () => {
    pf.filters.value.likesMin = 40
    const wrapper = await mountSuspended(C, { route: false })

    await dragAndRelease(wrapper, 0)

    expect(pf.updateFilters.mock.calls).toStrictEqual([[{ likesMin: undefined }]])
  })

  it('writes nothing on a release without a drag, or after the URL moved under the drag', async () => {
    const wrapper = await mountSuspended(C, { route: false })
    await dragAndRelease(wrapper)

    slider(wrapper).vm.$emit('update:modelValue', 12)
    pf.filters.value.likesMin = 30
    await nextTick()
    await dragAndRelease(wrapper)

    expect(slider(wrapper).props('modelValue')).toBe(30)
    expect(pf.updateFilters).not.toHaveBeenCalled()
  })
})
