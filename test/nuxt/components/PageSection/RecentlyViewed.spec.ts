import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import RecentlyViewed from '~/components/PageSection/RecentlyViewed.vue'

const { state } = vi.hoisted(() => ({
  state: {
    /** Merchant runtime settings; a missing key takes the caller's fallback. */
    flags: {} as Record<string, boolean>,
    items: [] as { id: number }[],
  },
}))
mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => state.flags[key] ?? options.fallback))
mockNuxtImport('useRecentlyViewed', () => () => ({ items: ref(state.items) }))

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { heading: 'Είδες πρόσφατα' }

const mountBand = (props: Record<string, unknown> = {}) => mountSuspended(RecentlyViewed, {
  route: false,
  props,
  global: { stubs: { ProductRecentlyViewed: { template: '<div data-test="rail" />' } } },
})

/**
 * The visitor's own history as a band. It is empty for every first-time
 * visitor, and the band must then be absent — not a heading over
 * nothing. The merchant setting fails closed.
 */
describe('PageSection/RecentlyViewed', () => {
  beforeEach(() => {
    state.flags = { RECENTLY_VIEWED_ENABLED: true }
    state.items = [{ id: 1 }, { id: 2 }]
  })

  it('draws the band over the visitor\'s history', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('h2').text()).toBe(COPY.heading)
    expect(wrapper.find('[data-test="rail"]').exists()).toBe(true)
  })

  it('uses the operator\'s heading over the default', async () => {
    const wrapper = await mountBand({ title: 'Τίτλος', heading: 'Ξαναδές τα' })

    expect(wrapper.find('h2').text()).toBe('Ξαναδές τα')
  })

  it.each<{ name: string, flags: Record<string, boolean>, items: { id: number }[] }>([
    { name: 'the visitor has viewed nothing yet', flags: { RECENTLY_VIEWED_ENABLED: true }, items: [] },
    { name: 'the merchant setting is missing', flags: {}, items: [{ id: 1 }] },
  ])('renders nothing when $name', async ({ flags, items }) => {
    state.flags = flags
    state.items = items

    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
