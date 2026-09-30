/**
 * useNavigation gates operator links exactly as the pages gate
 * themselves (shared/utils/gatedRoutes.ts). The rule itself is unit
 * tested; this proves the WIRING — that a NavigationMenu row pointing at
 * a switched-off feature never reaches a header, mobile bar or footer.
 *
 * Driven through a mounted component because useFetch needs a Nuxt
 * instance, and through registerEndpoint because the composable reads
 * two Nitro routes: the menus and the store settings.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { setTenant } from '~~/test/helpers/tenant'

registerEndpoint('/api/page-config/navigation', () => ({
  header: [
    { label: 'Προϊόντα', to: '/products' },
    { label: 'Προσφορές', to: '/offers' },
    { label: 'Επικοινωνία', to: '/contact' },
  ],
  mobile: [
    { label: 'Αρχική', to: '/' },
    { label: 'Loyalty', to: '/en/loyalty-program' },
  ],
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

let publicSettings: Record<string, string> = {}
registerEndpoint('/api/settings/public', () => ({ settings: publicSettings }))

const Probe = defineComponent({
  setup() {
    const { headerItems, mobileItems, footerColumns } = useNavigation()
    return () =>
      h('div', [
        h('ul', { id: 'header' }, (headerItems.value ?? []).map(i => h('li', i.to))),
        h('ul', { id: 'mobile' }, (mobileItems.value ?? []).map(i => h('li', i.to))),
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

const NAVIGATION_KEY = 'page-config-navigation-el'

async function render() {
  // The composable's useFetch calls are keyed and shared, so a second
  // render in the same test reads the FIRST render's asyncData — and a
  // component left mounted keeps that instance (and its watchers)
  // alive through clearNuxtData. Unmount first, clear, then wait until
  // the settings data IS what the endpoint serves now: the menus can
  // land before the settings, and waiting for "something arrived" once
  // judged the gate on an empty settings map.
  //
  // The keys are named, not left to a bare `clearNuxtData()`: that walks
  // only the keys already in the payload (nuxt asyncData.ts
  // `clearNuxtData`), so a `store-settings` request the app issued at
  // boot and that is still in flight survives it — and, `dedupe: 'defer'`,
  // the probe then joins that request and gets the settings of before the
  // test. A named key also drops its pending promise
  // (`clearNuxtDataByKey`), so the probe asks afresh.
  mounted?.unmount()
  clearNuxtData([STORE_SETTINGS_KEY, NAVIGATION_KEY])
  const wrapper = await mountSuspended(Probe, { route: false })
  mounted = wrapper
  const texts = (selector: string) =>
    wrapper.findAll(`${selector} > li`).map(li => li.text())
  await vi.waitFor(() => {
    expect(useNuxtData(NAVIGATION_KEY).data.value).toBeTruthy()
    expect(
      (useNuxtData(STORE_SETTINGS_KEY).data.value as { settings?: unknown })?.settings,
    ).toEqual(publicSettings)
  }, { interval: 1 })
  await wrapper.vm.$nextTick()
  return { wrapper, texts }
}

describe('useNavigation — feature gate on operator links', () => {
  beforeEach(() => {
    setTenant()
    publicSettings = {}
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = null
  })

  it('drops links to features the plan does not include', async () => {
    setTenant({ promotionsEnabled: false, giftCardsEnabled: false, loyaltyEnabled: false })
    publicSettings = { PROMOTIONS_ENABLED: 'True', GIFT_CARDS_ENABLED: 'True' }

    const { texts } = await render()

    expect(texts('#header')).toEqual(['/products', '/contact'])
    // The locale prefix is looked through, like the sitemap does.
    expect(texts('#mobile')).toEqual(['/'])
  })

  it('drops a column left with nothing to link', async () => {
    setTenant({ promotionsEnabled: false })

    const { wrapper } = await render()

    expect(wrapper.text()).not.toContain('Μόνο προσφορές')
    expect(wrapper.text()).toContain('Εξωτερικά')
  })

  it('keeps a fail-open route when its setting was never set, and drops it when off', async () => {
    setTenant({})
    let { texts } = await render()
    expect(texts('#header')).toContain('/products')

    publicSettings = { CATALOGUE_ENABLED: 'False' }
    ;({ texts } = await render())
    expect(texts('#header')).not.toContain('/products')
  })

  it('keeps a commercial route only when BOTH tiers pass', async () => {
    setTenant({ promotionsEnabled: true })
    let { texts } = await render()
    // Plan on, setting missing: fails closed like the page does.
    expect(texts('#header')).not.toContain('/offers')

    publicSettings = { PROMOTIONS_ENABLED: 'True' }
    ;({ texts } = await render())
    expect(texts('#header')).toContain('/offers')
  })

  it('never touches an external link', async () => {
    setTenant({ promotionsEnabled: false, giftCardsEnabled: false })

    const { wrapper } = await render()

    expect(wrapper.text()).toContain('https://instagram.com/x')
  })
})
