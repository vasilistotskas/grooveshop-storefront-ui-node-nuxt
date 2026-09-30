import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { ProductPromotion } from '~~/shared/openapi/types.gen'
import ProductOffers from '~/components/Product/Offers.vue'
import WebsideProductOffers from '~/components/variants/webside/Product/Offers.vue'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The product page's offer panel.
 *
 * Django decides WHICH offers touch the product and why; this pins what
 * the component itself owns — the two-tier commercial gate (plan flag
 * AND merchant setting, fail CLOSED, on the request as well as the
 * render) and the split that keeps a store-wide offer from burying the
 * one that is actually about this item.
 */

// Both the settings read (`useApi` → `$fetch`) and the offers request
// land on this one mock, so `registerEndpoint` is unused.
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { clipboardCopy, toastAdd } = vi.hoisted(() => ({
  clipboardCopy: vi.fn((_text: string) => Promise.resolve()),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useClipboard', () => () => ({ copy: clipboardCopy, isSupported: ref(true) }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const OFFERS_URL = '/api/promotions/product/2'

function offer(overrides: Partial<ProductPromotion> = {}): ProductPromotion {
  return {
    id: 1,
    name: 'Προσφορά',
    description: '',
    trigger: 'AUTOMATIC',
    benefitType: 'PERCENTAGE',
    benefitValue: 10,
    targetScope: 'ORDER',
    code: null,
    minSubtotal: null,
    maxDiscountAmount: null,
    minQuantity: null,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: 100,
    excludeDiscountedProducts: false,
    firstOrderOnly: false,
    stackable: true,
    endsAt: null,
    rewardProducts: [],
    eligibleProducts: [],
    eligibleProductCount: 0,
    eligibleCategories: [],
    relation: 'ORDER',
    ...overrides,
  }
}

describe.each(trees(ProductOffers, WebsideProductOffers))('$tree Product/Offers', ({ tree, C }) => {
  let offers: ProductPromotion[]
  let settings: () => unknown

  const mountPanel = async () => {
    const wrapper = await mountSuspended(C, { props: { productId: 2 }, route: false })
    await flushPromises()
    return wrapper
  }

  beforeEach(() => {
    // Both the store settings and the offers are cached by key on the
    // shared Nuxt app.
    clearNuxtData()
    setTenant({ promotionsEnabled: true })
    offers = []
    settings = () => ({ settings: { PROMOTIONS_ENABLED: 'true' } })
    api.routes({
      '/api/settings/public': () => settings(),
      [OFFERS_URL]: () => offers,
    })
  })

  // The gate used to apply to the render only, so a promotions-off store
  // still fired one request per product view and Django answered 404 to
  // every one — 58 in six hours on webside.gr.
  it.each([
    ['the tenant plan excludes promotions', () => setTenant({ promotionsEnabled: false })],
    ['the merchant turned promotions off', () => { settings = () => ({ settings: { PROMOTIONS_ENABLED: 'false' } }) }],
    ['the store settings cannot be read', () => { settings = () => { throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 }) } }],
  ])('neither asks for nor renders offers when %s', async (_case, arrange) => {
    arrange()
    offers = [offer({ relation: 'PRODUCT' })]

    const wrapper = await mountPanel()

    expect(api.callsTo(OFFERS_URL)).toHaveLength(0)
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it(tree === 'default'
    ? 'asks in the page language, since Django translates the offers'
    : 'asks without a language (the frozen copy predates the translated offers)', async () => {
    await mountPanel()

    const calls = api.callsTo(OFFERS_URL)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.options.query).toEqual(tree === 'default' ? { languageCode: 'el' } : undefined)
  })

  it('renders nothing when no offer touches the product', async () => {
    const wrapper = await mountPanel()

    expect(api.callsTo(OFFERS_URL)).toHaveLength(1)
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('counts every offer that applies in the heading', async () => {
    offers = [
      offer({ id: 1, relation: 'PRODUCT' }),
      offer({ id: 2, relation: 'CATEGORY' }),
      offer({ id: 3, relation: 'ORDER' }),
    ]

    const wrapper = await mountPanel()

    expect(wrapper.find('section').attributes('aria-label')).toBe('Προσφορές για αυτό το προϊόν')
    expect(wrapper.find('h2').text()).toBe('Προσφορές για αυτό το προϊόν 3')
  })

  it('renders product-specific offers openly and store-wide ones behind a toggle', async () => {
    offers = [
      offer({ id: 1, relation: 'PRODUCT', name: 'Μόνο για αυτό' }),
      offer({ id: 2, relation: 'ORDER', name: 'Σε όλο το κατάστημα' }),
      offer({ id: 3, relation: 'ORDER', name: 'Και αυτό παντού' }),
    ]

    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('Μόνο για αυτό')
    expect(wrapper.text()).not.toContain('Και αυτό παντού')

    const toggle = wrapper.findAll('button').find(b => b.text() === '2 προσφορές σε όλο το κατάστημα')
    expect(toggle).toBeDefined()
    await toggle!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Σε όλο το κατάστημα')
    expect(wrapper.text()).toContain('Και αυτό παντού')
  })

  it('opens the store-wide list by default when nothing is specific', async () => {
    // With no product-specific offer the panel would otherwise render a
    // header, a count and an empty body.
    offers = [offer({ id: 2, relation: 'ORDER', name: 'Σε όλο το κατάστημα' })]

    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('Σε όλο το κατάστημα')
  })

  it('shows the coupon code of a code offer and none for an automatic one', async () => {
    offers = [
      offer({ id: 1, relation: 'PRODUCT', trigger: 'CODE', code: 'PICK20' }),
      offer({ id: 2, relation: 'PRODUCT', trigger: 'AUTOMATIC', code: null }),
    ]

    const wrapper = await mountPanel()

    expect(wrapper.findAll('code').map(code => code.text())).toEqual(['PICK20'])
  })

  it('copies a coupon code and confirms it with a toast', async () => {
    offers = [offer({ id: 1, relation: 'PRODUCT', trigger: 'CODE', code: 'PICK20' })]
    const wrapper = await mountPanel()
    const label = useNuxtApp().$i18n.t('promotion.copy_code')

    await wrapper.get(`button[aria-label="${label}"]`).trigger('click')
    await flushPromises()

    expect(clipboardCopy).toHaveBeenCalledWith('PICK20')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('promotion.code_copied'),
      description: 'PICK20',
      color: 'success',
    }))
  })
})
