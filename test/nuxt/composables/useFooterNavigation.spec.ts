import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { NavColumn } from '~/composables/useNavigation'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The default footer's links in its two weights: the primary columns a
 * shopper scans (Shop, Help) and the secondary company and legal links.
 *
 * - An operator's footer menu wins: its first two columns are primary,
 *   the rest are secondary — the demo's Shop/Help/Company/Legal land as
 *   the design draws them.
 * - Without one, the code columns carry only pages that exist, behind
 *   the same gates as the pages.
 * - A published content page no column links is still reachable.
 */
const { state } = vi.hoisted(() => ({
  state: {
    footer: null as NavColumn[] | null,
    flags: {} as Record<string, boolean>,
    pages: [] as { slug: string, title: string }[],
  },
}))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => null),
  footerColumns: computed(() => state.footer),
  mobileItems: computed(() => null),
}))
mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => state.flags[key] ?? options.fallback))
mockNuxtImport('useFooterContentPages', () => () => ({
  links: computed(() => state.pages.map(page => ({ label: page.title, to: `/info/${page.slug}` }))),
}))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

let scope: EffectScope | undefined

function navigation() {
  scope = effectScope()
  let result!: ReturnType<typeof useFooterNavigation>
  scope.run(() => useNuxtApp().runWithContext(() => {
    result = useFooterNavigation()
  }))
  return { primary: result.primary.value, secondary: result.secondary.value }
}

const t = (key: string) => useNuxtApp().$i18n.t(key)
const paths = (links: { to: string }[]) => links.map(link => link.to)

describe('useFooterNavigation', () => {
  beforeEach(() => {
    state.footer = null
    state.flags = {}
    state.pages = []
    setTenant({ blogEnabled: false, promotionsEnabled: false, giftCardsEnabled: false, loyaltyEnabled: false })
  })

  afterEach(() => {
    scope?.stop()
  })

  it('splits an operator\'s menu: the first two columns primary, the rest secondary', () => {
    state.footer = [
      { label: 'Κατάστημα', children: [{ label: 'Όλα', to: '/products' }] },
      { label: 'Εξυπηρέτηση', children: [{ label: 'Επικοινωνία', to: '/contact' }] },
      { label: 'Η εταιρεία', children: [{ label: 'Σχετικά', to: '/about' }] },
      { label: 'Όροι', children: [{ label: 'Όροι χρήσης', to: '/terms-of-use' }, { label: 'Εξωτερικό', href: 'https://example.test' }] },
    ]

    const { primary, secondary } = navigation()

    expect(primary.map(column => column.label)).toEqual(['Κατάστημα', 'Εξυπηρέτηση'])
    expect(paths(secondary)).toEqual(['/about', '/terms-of-use', 'https://example.test'])
  })

  it('builds Shop and Help from the pages a store has', () => {
    const { primary } = navigation()

    expect(primary.map(column => column.label)).toEqual([t('footer.shop'), t('footer.help')])
    expect(paths(primary[0]!.children)).toEqual(['/products'])
    expect(paths(primary[1]!.children)).toEqual(['/contact', '/feedback'])
  })

  it('links offers, gift cards and rewards only behind both of their gates', () => {
    setTenant({ promotionsEnabled: true, giftCardsEnabled: true, loyaltyEnabled: true })
    const planOnly = navigation()
    expect(paths(planOnly.primary[0]!.children)).toEqual(['/products'])

    state.flags = { PROMOTIONS_ENABLED: true, GIFT_CARDS_ENABLED: true, LOYALTY_ENABLED: true }
    const both = navigation()
    expect(paths(both.primary[0]!.children)).toEqual(['/products', '/offers', '/gift-cards', '/loyalty-program'])
  })

  it('drops a column with nothing to link', () => {
    state.flags = { CATALOGUE_ENABLED: false }

    expect(navigation().primary.map(column => column.label)).toEqual([t('footer.help')])
  })

  it('puts the legal documents, and the blog when there is one, in the secondary links', () => {
    expect(paths(navigation().secondary)).toEqual(['/terms-of-use', '/privacy-policy', '/cookies-policy'])

    setTenant({ blogEnabled: true })
    expect(paths(navigation().secondary)[0]).toBe('/blog')
  })

  it('adds a published page no column links, once', () => {
    state.footer = [
      { label: 'Κατάστημα', children: [{ label: 'Όλα', to: '/products' }] },
      { label: 'Εξυπηρέτηση', children: [{ label: 'FAQ', to: '/info/faq' }] },
    ]
    state.pages = [
      { slug: 'faq', title: 'FAQ' },
      { slug: 'shipping-info', title: 'Αποστολές' },
    ]

    expect(paths(navigation().secondary)).toEqual(['/info/shipping-info'])
  })
})
