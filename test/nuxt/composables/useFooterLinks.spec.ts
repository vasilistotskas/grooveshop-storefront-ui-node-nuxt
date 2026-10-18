import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The footer every store renders, and the links it may carry.
 *
 * The code-level columns are what a tenant renders until an operator
 * publishes a NavigationMenu footer — the ordinary path for most stores —
 * so they may only link pages EVERY store has. They used to carry the
 * platform store's own IA ("Όραμα", a Microlearning column), so every
 * tenant advertised another company's concept and linked /vision,
 * /what-is-microlearning and /why-microlearning: crawlable dead links.
 * A default link must also never advertise a page a feature gate 404s.
 *
 * Asserted on the `to` values the footer renders, which is what a
 * visitor and a crawler follow — the previous source-text check passed
 * `localePath("vision")` and `{ name: 'vision' }` alike.
 */
interface NavColumn { label: string, icon?: string, children: Array<{ label: string, to?: string, href?: string }> }

let configuredColumns: NavColumn[] | null = null
let contentPages: Array<{ slug: string, translations: Record<string, { title: string }> }> = []

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => null),
  mobileItems: computed(() => null),
  footerColumns: computed(() => configuredColumns),
}))

let served = { contentPages: 0 }

registerEndpoint('/api/content-pages', () => {
  served.contentPages++
  return {
    count: contentPages.length,
    next: null,
    previous: null,
    results: contentPages,
  }
})

const page = (slug: string, title: string) => ({ slug, translations: { el: { title } } })

const hrefs = (columns: Array<{ children: Array<{ to: string }> }>) =>
  columns.flatMap(column => column.children.map(child => child.to))

/**
 * The footer once its content-pages request has settled — several
 * expectations below are also what the footer shows BEFORE it does, so
 * passing early would prove nothing.
 */
async function footer() {
  const { columns } = useFooterLinks()
  await vi.waitFor(() => expect(served).toEqual({ contentPages: 1 }))
  await flushPromises()
  return columns
}

beforeEach(() => {
  configuredColumns = null
  served = { contentPages: 0 }
  contentPages = []
  setTenant()
  clearNuxtData(['footer-content-pages'])
})

describe('useFooterLinks', () => {
  it('defaults to the pages every store has, and nothing brand-specific', async () => {
    const columns = await footer()

    expect(hrefs(columns.value)).toEqual([
      '/terms-of-use',
      '/privacy-policy',
      '/cookies-policy',
      '/contact',
      '/feedback',
    ])
  })

  it('drops the feedback link only when the store lacks the feedback feature', async () => {
    setTenantFeatures({ feedback: false })

    const columns = await footer()

    expect(hrefs(columns.value)).not.toContain('/feedback')
    expect(hrefs(columns.value)).toContain('/contact')
  })

  it.each([
    ['the store has the feature, plan flag off', false, true, true],
    ['the store lacks the feature, plan flag on', true, false, false],
  ])('links gift cards only when %s', async (_case, planFlag, feature, linked) => {
    setTenant({ giftCardsEnabled: planFlag })
    setTenantFeatures({ giftCards: feature })

    const columns = await footer()

    expect(hrefs(columns.value).includes('/gift-cards')).toBe(linked)
  })

  it('renders an operator-configured footer instead, resolving each link', async () => {
    configuredColumns = [{
      label: 'Εξυπηρέτηση',
      icon: 'i-heroicons-lifebuoy',
      children: [
        { label: 'Όροι', to: '/terms-of-use' },
        { label: 'Blog', href: 'https://blog.shop.test' },
        { label: 'Κενό' },
      ],
    }]

    const columns = await footer()

    expect(columns.value).toEqual([{
      label: 'Εξυπηρέτηση',
      icon: 'i-heroicons-lifebuoy',
      children: [
        { label: 'Όροι', to: '/terms-of-use' },
        { label: 'Blog', to: 'https://blog.shop.test' },
        { label: 'Κενό', to: '/' },
      ],
    }])
  })

  it('adds the published content pages, linking a legal slug at its canonical route', async () => {
    // Configured columns that do NOT link these routes, so none is deduped.
    configuredColumns = [{ label: 'Επικοινωνία', children: [{ label: 'Επικοινωνία', to: '/contact' }] }]
    contentPages = [page('faq', 'Συχνές ερωτήσεις'), page('return-policy', 'Επιστροφές')]

    const columns = await footer()

    expect(columns.value).toHaveLength(2)
    expect(columns.value[1]).toEqual({
      label: useNuxtApp().$i18n.t('footer.pages'),
      icon: 'i-heroicons-document-text',
      children: [
        { label: 'Συχνές ερωτήσεις', to: '/info/faq' },
        // /info/return-policy 301s to /return-policy; link the target.
        { label: 'Επιστροφές', to: '/return-policy' },
      ],
    })
  })

  it('drops a content page the other columns already link', async () => {
    // `terms` backs /terms-of-use, which the default columns link.
    contentPages = [page('terms', 'Όροι χρήσης'), page('faq', 'Συχνές ερωτήσεις')]

    const columns = await footer()

    expect(columns.value).toHaveLength(3)
    expect(columns.value[2]!.children).toEqual([{ label: 'Συχνές ερωτήσεις', to: '/info/faq' }])
  })

  it('omits the pages column when every page in it is already linked', async () => {
    contentPages = [page('terms', 'Όροι χρήσης')]

    const columns = await footer()

    expect(columns.value.map(column => column.label)).toEqual([
      useNuxtApp().$i18n.t('footer.terms_conditions'),
      useNuxtApp().$i18n.t('footer.help_center'),
    ])
  })
})
