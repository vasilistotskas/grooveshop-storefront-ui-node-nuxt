import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { ProductAlert } from '~~/shared/openapi/types.gen'
import ProductCard from '~/components/Product/Card.vue'
import WebsideProductCard from '~/components/variants/webside/Product/Card.vue'
import Spotlight from '~/components/Product/Spotlight.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct, makeProductCard } from '~~/test/fixtures/product'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The restock trigger wherever a sold-out product is listed, with the real
 * trigger mounted: a listing asks for the signed-in shopper's alerts ONCE,
 * whatever the number of sold-out cards, and each card says whether its own
 * alert is on. The default design's hero spotlight draws the same compact
 * trigger (`resolvePart('product_restock_alert')`).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { session } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { session: { loggedIn: ref(false), user: ref<{ id: number, email: string } | null>(null) } }
})
mockNuxtImport('useUserSession', () => () => ({
  ...session,
  session: { value: {} },
  ready: { value: true },
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockNuxtImport('useB2BPricing', () => () => ({ register: () => {}, priceFor: () => undefined }))

const ALERTS = '/api/products/alerts'

const restockAlert = (product: number): ProductAlert => ({
  id: product,
  uuid: fixtureUuid(8, product),
  kind: 'restock',
  product,
  user: 7,
  email: '',
  targetPrice: null,
  isActive: true,
  notifiedAt: null,
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
})

const signIn = () => {
  session.loggedIn.value = true
  session.user.value = { id: 7, email: 'maria@example.com' }
}

/** The names the triggers go by, in each design: the full sentence while off, "on" once set. */
const NAMES = {
  default: { off: 'Ειδοποίηση όταν ξαναέρθει', on: 'Ενεργή ειδοποίηση διαθεσιμότητας' },
  webside: { off: 'Ειδοποίηση όταν γίνει διαθέσιμο', on: 'Ενεργή ειδοποίηση διαθεσιμότητας' },
}

describe.each(trees(ProductCard, WebsideProductCard))('$tree sold-out cards in a listing', ({ tree, C }) => {
  beforeEach(() => {
    clearNuxtData()
    session.loggedIn.value = false
    session.user.value = null
    setTenant()
    setTenantFeatures({ productAlerts: true })
    api.routes({ [ALERTS]: () => ({ results: [restockAlert(12)], count: 1 }) })
  })

  const mountListing = async () => {
    const Listing = defineComponent({
      setup: () => () => h('ul', [11, 12, 13].map(id => h(C, { key: id, product: makeProduct({ id, stock: 0 }) }))),
    })
    const wrapper = await mountSuspended(Listing, { global: { stubs: { ImgWithFallback: true } }, route: false })
    await flushPromises()
    return wrapper
  }
  const triggerNames = async (wrapper: Awaited<ReturnType<typeof mountListing>>) => {
    await vi.waitFor(() => expect(wrapper.findAll('button[aria-label^="Ειδοποίηση"], button[aria-label^="Ενεργή"]').length).toBeGreaterThan(0))
    return wrapper.findAll('li').map(card => [...new Set(card.findAll('button[aria-label^="Ειδοποίηση"], button[aria-label^="Ενεργή"]').map(button => button.attributes('aria-label')))])
  }

  it('asks a signed-in shopper\'s alerts once for the whole listing, and marks the card whose alert is on', async () => {
    signIn()
    const wrapper = await mountListing()

    expect(await triggerNames(wrapper)).toEqual([[NAMES[tree].off], [NAMES[tree].on], [NAMES[tree].off]])
    expect(api.callsTo(ALERTS)).toHaveLength(1)
  })

  it('asks nothing for a guest', async () => {
    const wrapper = await mountListing()

    expect(await triggerNames(wrapper)).toEqual([[NAMES[tree].off], [NAMES[tree].off], [NAMES[tree].off]])
    expect(api.callsTo(ALERTS)).toHaveLength(0)
  })
})

describe('default Product/Spotlight, sold out', () => {
  beforeEach(() => {
    clearNuxtData()
    session.loggedIn.value = false
    session.user.value = null
    setTenant()
    setTenantFeatures({ cart: true, productAlerts: true })
    api.routes({ [ALERTS]: () => ({ results: [restockAlert(7)], count: 1 }) })
  })

  const mountSpotlight = async () => {
    const wrapper = await mountSuspended(Spotlight, { route: false, props: { product: makeProductCard({ id: 7, stock: 0 }) } })
    await flushPromises()
    return wrapper
  }

  it('draws the compact restock trigger', async () => {
    const wrapper = await mountSpotlight()

    const trigger = await vi.waitFor(() => {
      const found = wrapper.find(`button[aria-label="${NAMES.default.off}"]`)
      expect(found.exists()).toBe(true)
      return found
    })
    expect(trigger.text()).toBe('Ειδοποίηση')
  })

  it('says when the signed-in shopper\'s alert is on', async () => {
    signIn()
    const wrapper = await mountSpotlight()

    const trigger = await vi.waitFor(() => {
      const found = wrapper.find(`button[aria-label="${NAMES.default.on}"]`)
      expect(found.exists()).toBe(true)
      return found
    })
    expect(trigger.text()).toBe('Ενεργή')
  })
})
