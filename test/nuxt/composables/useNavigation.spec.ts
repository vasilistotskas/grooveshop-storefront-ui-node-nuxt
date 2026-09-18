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
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

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

// The Nuxt app's OWN Pinia, not a `createPinia()` swapped in with
// setActivePinia: the mounted component injects the app's instance, so
// a flag set on any other store never reaches the composable. (The
// pixel specs can swap it because they call the composable directly.)
function setPlan(flags: Partial<TenantConfig>) {
  useTenantStore().setConfig(validTenantConfig('test.local', flags))
}

let mounted: Awaited<ReturnType<typeof mountSuspended>> | null = null

async function render() {
  // The composable's useFetch calls are keyed and shared, so a second
  // render in the same test reads the FIRST render's asyncData — and a
  // component left mounted keeps that instance (and its watchers)
  // alive through clearNuxtData. Unmount first, clear, then wait until
  // the settings data IS what the endpoint serves now: the menus can
  // land before the settings, and waiting for "something arrived" once
  // judged the gate on an empty settings map.
  mounted?.unmount()
  clearNuxtData()
  const wrapper = await mountSuspended(Probe)
  mounted = wrapper
  const texts = (selector: string) =>
    wrapper.findAll(`${selector} > li`).map(li => li.text())
  await vi.waitFor(() => {
    expect(useNuxtData('page-config-navigation-el').data.value).toBeTruthy()
    expect(
      (useNuxtData('store-settings').data.value as { settings?: unknown })?.settings,
    ).toEqual(publicSettings)
  })
  await wrapper.vm.$nextTick()
  return { wrapper, texts }
}

describe('useNavigation — feature gate on operator links', () => {
  beforeEach(() => {
    setPlan({})
    publicSettings = {}
  })

  it('drops links to features the plan does not include', async () => {
    setPlan({ promotionsEnabled: false, giftCardsEnabled: false, loyaltyEnabled: false })
    publicSettings = { PROMOTIONS_ENABLED: 'True', GIFT_CARDS_ENABLED: 'True' }

    const { texts } = await render()

    expect(texts('#header')).toEqual(['/products', '/contact'])
    // The locale prefix is looked through, like the sitemap does.
    expect(texts('#mobile')).toEqual(['/'])
  })

  it('drops a column left with nothing to link', async () => {
    setPlan({ promotionsEnabled: false })

    const { wrapper } = await render()

    expect(wrapper.text()).not.toContain('Μόνο προσφορές')
    expect(wrapper.text()).toContain('Εξωτερικά')
  })

  it('keeps a fail-open route when its setting was never set, and drops it when off', async () => {
    setPlan({})
    let { texts } = await render()
    expect(texts('#header')).toContain('/products')

    publicSettings = { CATALOGUE_ENABLED: 'False' }
    ;({ texts } = await render())
    expect(texts('#header')).not.toContain('/products')
  })

  it('keeps a commercial route only when BOTH tiers pass', async () => {
    setPlan({ promotionsEnabled: true })
    let { texts } = await render()
    // Plan on, setting missing: fails closed like the page does.
    expect(texts('#header')).not.toContain('/offers')

    publicSettings = { PROMOTIONS_ENABLED: 'True' }
    ;({ texts } = await render())
    expect(texts('#header')).toContain('/offers')
  })

  it('never touches an external link', async () => {
    setPlan({ promotionsEnabled: false, giftCardsEnabled: false })

    const { wrapper } = await render()

    expect(wrapper.text()).toContain('https://instagram.com/x')
  })
})
