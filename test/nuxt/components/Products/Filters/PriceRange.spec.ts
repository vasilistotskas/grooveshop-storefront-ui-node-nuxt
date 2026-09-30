import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import PriceRange from '~/components/Products/Filters/PriceRange.vue'
import WebsidePriceRange from '~/components/variants/webside/Products/Filters/PriceRange.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The price filter writes the URL twice over: the slider on release
 * (dragging only moves the numbers), the two inputs 300 ms after the
 * last change. A bound left at the catalogue's own min/max is NOT a
 * filter, so it goes to the URL as `undefined` and the query string
 * stays clean. The two trees differ only in one class on the range
 * readout.
 */
const pf = await vi.hoisted(async () =>
  (await import('~~/test/fixtures/productFilters')).createProductFiltersMock())
mockNuxtImport('useProductFilters', () => () => pf)

const stats = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    priceStats: ref({ min: 0, max: 1000 }),
    isPriceStatsLoaded: ref(true),
  }
})
mockNuxtImport('useProductSearchData', () => () => stats)

const DEBOUNCE_MS = 300

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

/** The readout of the range the filter is set to: the one `<from> – <to>` text. */
const readout = (wrapper: VueWrapper) => {
  const spans = wrapper.findAll('span').filter(s => s.element.children.length === 0 && s.text().includes(' – '))
  expect(spans, 'expected exactly one range readout').toHaveLength(1)
  return spans[0]!.text()
}

const slider = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'USlider' })

/**
 * Drag the slider: USlider's pointer handling lives in Reka, so the
 * spec drives its two documented events — `update:modelValue` while
 * dragging, `change` on release — rather than synthesising pointer
 * geometry happy-dom cannot lay out.
 */
async function drag(wrapper: VueWrapper, range: [number, number]) {
  slider(wrapper).vm.$emit('update:modelValue', range)
  await nextTick()
}

async function release(wrapper: VueWrapper) {
  slider(wrapper).vm.$emit('change')
  await nextTick()
}

async function type(wrapper: VueWrapper, id: 'price-min-input' | 'price-max-input', value: string) {
  const input = wrapper.find(`#${id}`)
  await input.setValue(value)
  await input.trigger('change')
}

describe.each(trees(PriceRange, WebsidePriceRange))('$tree Products/Filters/PriceRange', ({ C }) => {
  beforeEach(() => {
    pf.reset()
    stats.priceStats.value = { min: 0, max: 1000 }
    stats.isPriceStatsLoaded.value = true
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('spans the catalogue from its cheapest to its dearest product with no filter set', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    expect(readout(wrapper)).toBe(`${money(0)} – ${money(1000)}`)
    expect(slider(wrapper).props()).toMatchObject({ min: 0, max: 1000, modelValue: [0, 1000] })
  })

  it('shows the range from the URL', async () => {
    pf.filters.value = { ...pf.filters.value, priceMin: 100, priceMax: 500 }

    const wrapper = await mountSuspended(C, { route: false })

    expect(readout(wrapper)).toBe(`${money(100)} – ${money(500)}`)
    expect((wrapper.find('#price-min-input').element as HTMLInputElement).value).toBe('100')
    expect((wrapper.find('#price-max-input').element as HTMLInputElement).value).toBe('500')
  })

  it.each([
    ['until the price stats arrive', { isPriceStatsLoaded: false, priceStats: { min: 0, max: 1000 } }],
    ['when every product costs the same', { isPriceStatsLoaded: true, priceStats: { min: 20, max: 20 } }],
  ])('shows a skeleton instead of the controls %s', async (_case, state) => {
    stats.isPriceStatsLoaded.value = state.isPriceStatsLoaded
    stats.priceStats.value = state.priceStats

    const wrapper = await mountSuspended(C, { route: false })

    expect(slider(wrapper).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
  })

  describe('the slider', () => {
    it('moves the readout while dragging but writes the URL only on release', async () => {
      const wrapper = await mountSuspended(C, { route: false })

      await drag(wrapper, [200, 800])
      expect(readout(wrapper)).toBe(`${money(200)} – ${money(800)}`)
      expect(pf.updateFilters).not.toHaveBeenCalled()

      await release(wrapper)

      expect(pf.updateFilters.mock.calls).toStrictEqual([[{ priceMin: 200, priceMax: 800 }]])
    })

    it('sends a bound dragged back to the catalogue edge as no bound', async () => {
      pf.filters.value = { ...pf.filters.value, priceMin: 100, priceMax: 500 }
      const wrapper = await mountSuspended(C, { route: false })

      await drag(wrapper, [0, 500])
      await release(wrapper)

      expect(pf.updateFilters.mock.calls).toStrictEqual([[{ priceMin: undefined, priceMax: 500 }]])
    })

    it('writes nothing on a release without a drag', async () => {
      const wrapper = await mountSuspended(C, { route: false })

      await release(wrapper)

      expect(pf.updateFilters).not.toHaveBeenCalled()
    })
  })

  describe('the inputs', () => {
    it('write the URL 300 ms after the last change, keeping the other bound', async () => {
      pf.filters.value = { ...pf.filters.value, priceMax: 500 }
      const wrapper = await mountSuspended(C, { route: false })
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      await type(wrapper, 'price-min-input', '120')
      await type(wrapper, 'price-min-input', '150')
      expect(readout(wrapper)).toBe(`${money(150)} – ${money(500)}`)
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
      expect(pf.updateFilters).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)

      expect(pf.updateFilters.mock.calls).toStrictEqual([[{ priceMin: 150, priceMax: 500 }]])
    })

    it('send a maximum typed back to the catalogue maximum as no bound', async () => {
      pf.filters.value = { ...pf.filters.value, priceMax: 500 }
      const wrapper = await mountSuspended(C, { route: false })
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      await type(wrapper, 'price-max-input', '1000')
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

      expect(pf.updateFilters.mock.calls).toStrictEqual([[{ priceMin: undefined, priceMax: undefined }]])
    })
  })

  it('drops an unsaved drag when the URL changes underneath it', async () => {
    const wrapper = await mountSuspended(C, { route: false })
    await drag(wrapper, [200, 800])

    pf.filters.value = { ...pf.filters.value, priceMin: 300, priceMax: 400 }
    await nextTick()

    expect(readout(wrapper)).toBe(`${money(300)} – ${money(400)}`)
    await release(wrapper)
    expect(pf.updateFilters).not.toHaveBeenCalled()
  })
})
