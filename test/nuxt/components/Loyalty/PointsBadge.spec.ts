import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import LoyaltyPointsBadge from '~/components/Loyalty/PointsBadge.vue'
import WebsideLoyaltyPointsBadge from '~/components/variants/webside/Loyalty/PointsBadge.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { setTenant } from '~~/test/helpers/tenant'
import { makeLoyaltySettings, makeProductPoints } from '~~/test/fixtures/loyalty'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import type { ProductPoints } from '~~/shared/openapi/types.gen'

/**
 * The product page's "earn N points" badge, on a store with loyalty on.
 * The frozen copy renders for a signed-in shopper only; the default
 * renders for everyone, a guest at the store's base rate.
 */
const loggedIn = ref(false)
const settings = createAsyncDataMock<LoyaltySettings>()
const points = createAsyncDataMock<ProductPoints | null>()
const fetchProductPoints = vi.fn((_productId: number, _enabled: MaybeRefOrGetter<boolean>) => points)
/** Whether the badge let the points request go out (its `enabled` gate). */
const asksForPoints = () => toValue(fetchProductPoints.mock.calls[0]![1])

// The whole session surface: the app's auth plugins call it while booting.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn,
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockNuxtImport('useLoyalty', () => () => ({
  fetchSettings: () => settings,
  fetchProductPoints,
}))

/** The frozen copy, pinned as it renders on webside.gr. */
describe('webside Loyalty/PointsBadge', () => {
  const C = WebsideLoyaltyPointsBadge
  beforeEach(() => {
    setTenant({ loyaltyEnabled: true })
    settings.reset()
    points.reset()
    loggedIn.value = true
    settings.data.value = makeLoyaltySettings()
    settings.status.value = 'success'
    points.data.value = makeProductPoints({ productId: 7, potentialPoints: 24 })
    points.status.value = 'success'
  })

  const mountBadge = () => mountSuspended(C, { props: { productId: 7 }, route: false })

  it('offers the points the product earns, asked for that product', async () => {
    const wrapper = await mountBadge()

    expect(fetchProductPoints).toHaveBeenCalledWith(7, expect.anything())
    expect(asksForPoints()).toBe(true)
    expect(wrapper.text()).toBe('Κέρδισε 24 πόντους')
  })

  // Each of these also keeps the points request from going out: Django
  // answers 404 on a store without loyalty.
  it.each([
    ['a guest', () => { loggedIn.value = false }],
    ['a store with loyalty off', () => { settings.data.value = makeLoyaltySettings({ enabled: false }) }],
    ['a store whose plan has no loyalty', () => { setTenant({ loyaltyEnabled: false }) }],
    ['settings that have not arrived', () => { settings.data.value = undefined }],
  ])('renders nothing and asks for no points for %s', async (_case, arrange) => {
    arrange()

    const wrapper = await mountBadge()

    expect(asksForPoints()).toBe(false)
    expect(wrapper.find('div').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('holds the space with a skeleton while the preview loads', async () => {
    points.data.value = undefined
    points.status.value = 'pending'

    const wrapper = await mountBadge()

    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
    expect(wrapper.text()).toBe('')
  })

  it('keeps the container but shows no badge when the preview failed', async () => {
    points.data.value = null
    points.status.value = 'error'

    const wrapper = await mountBadge()

    expect(wrapper.find('div').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})

/**
 * One "Earn N points" badge beside the price, for every shopper: the
 * points Django works out for a signed-in one (their tier included), the
 * store's base rate on the price for anyone else.
 */
describe('default Loyalty/PointsBadge', () => {
  beforeEach(() => {
    setTenant({ loyaltyEnabled: true })
    settings.reset()
    points.reset()
    loggedIn.value = true
    settings.data.value = makeLoyaltySettings({ pointsFactor: 1.5 })
    settings.status.value = 'success'
    points.data.value = makeProductPoints({ productId: 7, potentialPoints: 36, tierMultiplierApplied: true })
    points.status.value = 'success'
  })

  const mountBadge = (productPrice = 41.5) =>
    mountSuspended(LoyaltyPointsBadge, { props: { productId: 7, productPrice }, route: false })

  it('offers a signed-in shopper the points Django works out for them', async () => {
    const wrapper = await mountBadge()

    expect(fetchProductPoints).toHaveBeenCalledWith(7, expect.anything())
    expect(asksForPoints()).toBe(true)
    expect(wrapper.text()).toBe('Κέρδισε 36 πόντους')
  })

  it('offers a guest the base rate on the price, without asking Django', async () => {
    loggedIn.value = false

    const wrapper = await mountBadge(41.5)

    // floor(41.5 × 1.5) = 62
    expect(asksForPoints()).toBe(false)
    expect(wrapper.text()).toBe('Κέρδισε 62 πόντους')
  })

  it('shows the base rate while a signed-in shopper\'s own figure is on its way', async () => {
    points.data.value = undefined
    points.status.value = 'pending'

    const wrapper = await mountBadge(20)

    expect(wrapper.text()).toBe('Κέρδισε 30 πόντους')
  })

  it.each([
    ['a store with loyalty off', () => { settings.data.value = makeLoyaltySettings({ enabled: false }) }],
    ['a store whose plan has no loyalty', () => { setTenant({ loyaltyEnabled: false }) }],
  ])('renders nothing and asks for no points on %s', async (_case, arrange) => {
    arrange()

    const wrapper = await mountBadge()

    expect(asksForPoints()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders nothing when the price earns no points', async () => {
    loggedIn.value = false

    const wrapper = await mountBadge(0.5)

    expect(wrapper.text()).toBe('')
  })
})
