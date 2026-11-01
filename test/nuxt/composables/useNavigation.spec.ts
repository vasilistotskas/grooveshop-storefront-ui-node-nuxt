/**
 * useNavigation gates operator links exactly as the pages gate
 * themselves (shared/utils/gatedRoutes.ts). The rule itself is unit
 * tested; this proves the WIRING — that a menu link pointing at
 * a switched-off feature never reaches a header, mobile bar or footer.
 *
 * Driven through a mounted component because useFetch needs a Nuxt
 * instance, and through registerEndpoint because the composable reads
 * two Nitro routes: the menus and the store settings.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/** Whether the store configured a Mobile menu; a store with none gets no `mobile` key. */
let withMobileSlot = true
registerEndpoint('/api/builder/navigation', () => ({
  header: [
    { label: 'Προϊόντα', to: '/products' },
    { label: 'Προσφορές', to: '/offers' },
    { label: 'Επικοινωνία', to: '/contact' },
  ],
  ...(withMobileSlot
    ? {
        mobile: [
          { label: 'Αρχική', to: '/' },
          { label: 'Loyalty', to: '/en/loyalty-program' },
        ],
      }
    : {}),
  footer: [
    {
      label: 'Κατάστημα',
      children: [
        { label: 'Προϊόντα', to: '/products' },
        { label: 'Δώρα', to: '/gift-cards' },
      ],
    },
    {
      label: 'Μόνο προσφορές',
      children: [{ label: 'Προσφορές', to: '/offers' }],
    },
    {
      label: 'Εξωτερικά',
      children: [{ label: 'Instagram', href: 'https://instagram.com/x' }],
    },
  ],
}))

const Probe = defineComponent({
  setup() {
    const { headerItems, mobileLinks, footerColumns } = useNavigation()
    return () =>
      h('div', [
        h('ul', { id: 'header' }, (headerItems.value ?? []).map(i => h('li', i.to))),
        h('ul', { id: 'phone' }, (mobileLinks.value ?? []).map(i => h('li', i.to))),
        h(
          'ul',
          { id: 'footer' },
          (footerColumns.value ?? []).map(col =>
            h('li', [
              col.label,
              h('ul', col.children.map(c => h('li', c.to ?? c.href))),
            ]),
          ),
        ),
      ])
  },
})

let mounted: Awaited<ReturnType<typeof mountSuspended>> | null = null

const NAVIGATION_KEY = 'builder-navigation-el'

async function render() {
  // The composable's useFetch calls are keyed and shared, so a second
  // render in the same test reads the FIRST render's asyncData — and a
  // component left mounted keeps that instance (and its watchers)
  // alive through clearNuxtData. Unmount first, clear, then wait for the
  // menus. The gate reads the tenant payload, which is set before render.
  //
  // The key is named, not left to a bare `clearNuxtData()`: that walks
  // only the keys already in the payload (nuxt asyncData.ts
  // `clearNuxtData`), so a request still in flight survives it. A named
  // key also drops its pending promise (`clearNuxtDataByKey`), so the
  // probe asks afresh.
  mounted?.unmount()
  clearNuxtData([NAVIGATION_KEY])
  const wrapper = await mountSuspended(Probe, { route: false })
  mounted = wrapper
  const texts = (selector: string) =>
    wrapper.findAll(`${selector} > li`).map(li => li.text())
  await vi.waitFor(() => {
    expect(useNuxtData(NAVIGATION_KEY).data.value).toBeTruthy()
  }, { interval: 1 })
  await wrapper.vm.$nextTick()
  return { wrapper, texts }
}

describe('useNavigation — feature gate on operator links', () => {
  beforeEach(() => {
    setTenant()
    withMobileSlot = true
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = null
  })

  it('drops links to features the store does not have, whatever the plan flags say', async () => {
    setTenant({ promotionsEnabled: true, giftCardsEnabled: true, loyaltyEnabled: true })
    setTenantFeatures({ promotions: false, giftCards: false, loyalty: false })

    const { texts } = await render()

    expect(texts('#header')).toEqual(['/products', '/contact'])
    // The locale prefix is looked through, like the sitemap does.
    expect(texts('#phone')).toEqual(['/'])
  })

  it('lists the Mobile menu on a phone, and the Header menu when the store set none', async () => {
    const withSlot = await render()
    expect(withSlot.texts('#phone')).toEqual(['/'])

    withMobileSlot = false
    const without = await render()
    expect(without.texts('#phone')).toEqual(['/products', '/contact'])
  })

  it('drops a column left with nothing to link', async () => {
    setTenantFeatures({ promotions: false })

    const { wrapper } = await render()

    expect(wrapper.text()).not.toContain('Μόνο προσφορές')
    expect(wrapper.text()).toContain('Εξωτερικά')
  })

  it('keeps the catalogue while its feature is on, and drops it when off', async () => {
    setTenant({})
    let { texts } = await render()
    expect(texts('#header')).toContain('/products')

    setTenantFeatures({ catalogue: false })
    ;({ texts } = await render())
    expect(texts('#header')).not.toContain('/products')
  })

  it('keeps a feature route exactly when the store has the feature', async () => {
    setTenant({ promotionsEnabled: false })
    setTenantFeatures({ promotions: false })
    let { texts } = await render()
    expect(texts('#header')).not.toContain('/offers')

    // No setting row and no plan flag: the feature alone opens it.
    setTenantFeatures({ promotions: true })
    ;({ texts } = await render())
    expect(texts('#header')).toContain('/offers')
  })

  it('never touches an external link', async () => {
    setTenantFeatures({ promotions: false, giftCards: false })

    const { wrapper } = await render()

    expect(wrapper.text()).toContain('https://instagram.com/x')
  })
})
