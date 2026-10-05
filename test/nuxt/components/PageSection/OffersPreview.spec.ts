import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import OffersPreview from '~/components/PageSection/OffersPreview.vue'
import { setTenant } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { state, toastAdd, copy } = vi.hoisted(() => ({
  /** Merchant runtime settings; a missing key takes the caller's fallback. */
  state: { flags: {} as Record<string, boolean> },
  toastAdd: vi.fn(),
  copy: vi.fn(),
}))
mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => state.flags[key] ?? options.fallback))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useClipboard', () => () => ({ copy, isSupported: ref(true) }))

const PROMOTIONS_URL = '/api/promotions'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = {
  eyebrow: 'Τρέχουσες προσφορές',
  heading: 'Κωδικοί που όντως ισχύουν.',
  allOffers: 'Όλες οι 4 προσφορές',
  copied: 'Ο κωδικός SAVE5 αντιγράφηκε',
}

/** Stands in for an offer coupon: shows its id and offers its code. */
const CardStub = defineComponent({
  props: { offer: { type: Object, required: true } },
  emits: ['copy'],
  setup: (props, { emit }) => () => {
    const offer = props.offer as { id: number, code: string }
    return h('button', { 'data-offer': offer.id, 'onClick': () => emit('copy', offer.code) })
  },
})

const offer = (id: number) => ({ id, code: `CODE${id}` })

const mountBand = (props: Record<string, unknown> = {}) =>
  mountSuspended(OffersPreview, { route: false, props, global: { stubs: { OffersCoupon: CardStub } } })

const cards = (wrapper: Awaited<ReturnType<typeof mountBand>>) =>
  wrapper.findAll('[data-offer]').map(card => card.attributes('data-offer'))

/**
 * The store's running offers as a band. Promotions are a two-tier
 * commercial feature — the plan flag AND the merchant's runtime setting
 * — and fail CLOSED: a missing setting row advertises nothing.
 */
describe('PageSection/OffersPreview', () => {
  beforeEach(() => {
    // Cached under `offers-preview-<locale>`.
    clearNuxtData()
    setTenant({ promotionsEnabled: true })
    state.flags = { PROMOTIONS_ENABLED: true }
    api.routes({ [PROMOTIONS_URL]: [offer(1), offer(2), offer(3), offer(4)] })
  })

  it('shows the first three offers under a heading and a link that counts them all', async () => {
    const wrapper = await mountBand()

    expect(wrapper.text()).toContain(COPY.eyebrow)
    expect(wrapper.find('h2').text()).toBe(COPY.heading)
    expect(cards(wrapper)).toEqual(['1', '2', '3'])
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual([COPY.allOffers, '/offers'])
    expect(api.callsTo(PROMOTIONS_URL)[0]!.options.query).toEqual({ languageCode: 'el' })
  })

  it('shows as many offers as the operator asked for, and still counts them all', async () => {
    const wrapper = await mountBand({ limit: 2 })

    expect(cards(wrapper)).toEqual(['1', '2'])
    expect(wrapper.find('a').text()).toBe(COPY.allOffers)
  })

  it('lets the operator\'s own words and link win over the counted one', async () => {
    const wrapper = await mountBand({ ctaText: 'Δες τα κουπόνια', ctaLink: '/info/coupons' })

    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Δες τα κουπόνια', '/info/coupons'])
  })

  it.each([
    { surface: undefined, expected: 'bg-inverted' },
    { surface: 'ink', expected: 'bg-inverted' },
    { surface: 'muted', expected: 'bg-muted' },
    { surface: 'default', expected: 'bg-default' },
  ])('sets the band on $expected for surface $surface', async ({ surface, expected }) => {
    // The class IS the contract: the design sets the offers on ink, and
    // a layout may ask for a lighter ground instead.
    const wrapper = await mountBand({ surface })

    expect(wrapper.find('section').classes()).toContain(expected)
  })

  it('prints the eyebrow of the operator over the default one', async () => {
    const wrapper = await mountBand({ eyebrow: 'Μόνο αυτή την εβδομάδα' })

    expect(wrapper.text()).toContain('Μόνο αυτή την εβδομάδα')
    expect(wrapper.text()).not.toContain(COPY.eyebrow)
  })

  it.each<{ name: string, tenant: boolean, flags: Record<string, boolean> }>([
    { name: 'the merchant setting is missing', tenant: true, flags: {} },
    { name: 'the plan has no promotions', tenant: false, flags: { PROMOTIONS_ENABLED: true } },
  ])('asks for nothing and renders nothing when $name', async ({ tenant, flags }) => {
    setTenant({ promotionsEnabled: tenant })
    state.flags = flags

    const wrapper = await mountBand()

    expect(api.callsTo(PROMOTIONS_URL)).toEqual([])
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('renders nothing while no offer is running', async () => {
    api.routes({ [PROMOTIONS_URL]: [] })

    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('copies an offer\'s code and says so', async () => {
    api.routes({ [PROMOTIONS_URL]: [{ id: 1, code: 'SAVE5' }] })
    const wrapper = await mountBand()

    await wrapper.find('[data-offer="1"]').trigger('click')

    expect(copy).toHaveBeenCalledWith('SAVE5')
    expect(toastAdd).toHaveBeenCalledWith({ title: COPY.copied, color: 'success' })
  })
})
