import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import RecentlyViewed from '~/components/PageSection/RecentlyViewed.vue'
import { setTenant, setTenantPreferences } from '~~/test/helpers/tenant'

const { state } = vi.hoisted(() => ({
  state: {
    items: [] as { id: number }[],
  },
}))
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
    setTenant()
    setTenantPreferences({ recentlyViewed: true })
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

  it.each<{ name: string, on: boolean, items: { id: number }[] }>([
    { name: 'the visitor has viewed nothing yet', on: true, items: [] },
    { name: 'the store turned the rail off', on: false, items: [{ id: 1 }] },
  ])('renders nothing when $name', async ({ on, items }) => {
    setTenantPreferences({ recentlyViewed: on })
    state.items = items

    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
