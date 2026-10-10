import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import RecentlyViewed from '~/components/Product/RecentlyViewed.vue'

const state = vi.hoisted(() => ({
  items: [] as { id: number, name: string, slug: string, finalPrice: number | null, mainImagePath: string | null }[],
  register: vi.fn(),
  wholesale: {} as Record<number, { finalPrice: string }>,
}))
mockNuxtImport('useRecentlyViewed', () => () => ({ itemsExcluding: () => computed(() => state.items) }))
mockNuxtImport('useB2BPricing', () => () => ({
  register: state.register,
  priceFor: (id: number) => state.wholesale[id],
}))

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

const item = (id: number, finalPrice: number | null) => ({
  id,
  name: `Προϊόν ${id}`,
  slug: `proion-${id}`,
  finalPrice,
  mainImagePath: null,
})

/**
 * The visitor's history rail prices each product the way the product card
 * does: a wholesale price below retail replaces it.
 */
describe('Product/RecentlyViewed', () => {
  beforeEach(() => {
    state.items = [item(1, 124), item(2, 62), item(3, null)]
    state.wholesale = {}
  })

  const mountRail = () => mountSuspended(RecentlyViewed, {
    route: false,
    global: { stubs: { ImgWithFallback: true } },
  })

  it('asks for the wholesale price of every product it shows', async () => {
    await mountRail()

    expect(state.register).toHaveBeenCalledWith([1, 2, 3])
  })

  it('shows the retail price of a product with no wholesale price', async () => {
    const wrapper = await mountRail()
    await vi.waitFor(() => expect(wrapper.text()).toContain(money(124)))

    expect(wrapper.text()).toContain(money(62))
  })

  it('shows a wholesale price in place of a higher retail one, and ignores one that is not lower', async () => {
    state.wholesale = { 1: { finalPrice: '90.00' }, 2: { finalPrice: '70.00' } }

    const wrapper = await mountRail()
    await vi.waitFor(() => expect(wrapper.text()).toContain(money(90)))

    expect(wrapper.text()).not.toContain(money(124))
    expect(wrapper.text()).toContain(money(62))
    expect(wrapper.text()).not.toContain(money(70))
  })
})
