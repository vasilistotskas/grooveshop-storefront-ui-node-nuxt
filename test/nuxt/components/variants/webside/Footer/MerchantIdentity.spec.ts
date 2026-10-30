import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import FooterDesktop from '~/components/variants/webside/Footer/Desktop.vue'
import FooterMobile from '~/components/variants/webside/Footer/Mobile.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Webside's footers draw the seller identity (N. 4919/2022 art. 22 §4: legal
 * form, name and seat "σε εμφανές σημείο") under the footer column the
 * operator marked for it (`NavigationColumn.shows_merchant_identity`), the
 * "Σχετικά με εμάς" column on webside. A footer with no marked column keeps
 * the identity in its bottom bar, so it is on every page whichever way
 * the store laid its footer out. The mobile footer always keeps it in the
 * bottom bar: a collapsed accordion column is not "εμφανές".
 */
interface NavColumn { label: string, showsMerchantIdentity?: boolean, children: Array<{ label: string, to: string }> }

const ABOUT: NavColumn = {
  label: 'Σχετικά με εμάς',
  showsMerchantIdentity: true,
  children: [{ label: 'Σχετικά με το Webside', to: '/about' }],
}
const HELP: NavColumn = {
  label: 'Βοήθεια',
  children: [{ label: 'Επικοινωνία', to: '/contact' }],
}

let configuredColumns: NavColumn[] | null = null

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => null),
  mobileLinks: computed(() => null),
  footerColumns: computed(() => configuredColumns),
}))

const legalIdentity = { distinctiveTitle: 'ΑΓΟΡΑ ΕΞΠΡΕΣΣ' }

registerEndpoint('/api/tenant/legal-identity', () => {
  return {
    ...legalIdentity,
    name: 'ΚΑΛΑΙΤΖΗ ΑΝΑΣΤΑΣΙΑ & ΣΙΑ Ε.Ε.',
    legalForm: 'Ετερόρρυθμη Εταιρεία (Ε.Ε.)',
    vatId: '801234567',
    registrationNumber: '123456701000',
    addressLine1: 'Ερμού 1',
    city: 'Αθήνα',
  }
})
registerEndpoint('/api/content-pages', () => ({ count: 0, next: null, previous: null, results: [] }))

async function mountFooter(C: typeof FooterDesktop | typeof FooterMobile) {
  const wrapper = await mountSuspended(C, { route: false })
  await vi.waitFor(() => expect(wrapper.find('address').exists()).toBe(true))
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  configuredColumns = null
  legalIdentity.distinctiveTitle = 'ΑΓΟΡΑ ΕΞΠΡΕΣΣ'
  setTenant()
  clearNuxtData(['tenant-legal-identity', 'footer-content-pages'])
})

describe('webside Footer/Desktop seller identity', () => {
  it('sits under the marked column, not in the bottom bar', async () => {
    configuredColumns = [HELP, ABOUT]

    const wrapper = await mountFooter(FooterDesktop)

    const addresses = wrapper.findAll('address')
    expect(addresses).toHaveLength(1)
    const column = addresses[0]!.element.parentElement!
    expect(column.textContent).toContain('Σχετικά με το Webside')
    expect(column.textContent).not.toContain('Επικοινωνία')
    // The distinctive title stands in place of the legal name.
    expect(addresses[0]!.text()).toContain('ΑΓΟΡΑ ΕΞΠΡΕΣΣ')
    expect(addresses[0]!.text()).not.toContain('ΚΑΛΑΙΤΖΗ')
  })

  it('keeps the identity in the bottom bar when no column is marked', async () => {
    configuredColumns = [HELP]

    const wrapper = await mountFooter(FooterDesktop)

    const addresses = wrapper.findAll('address')
    expect(addresses).toHaveLength(1)
    expect(addresses[0]!.element.parentElement!.textContent).not.toContain('Επικοινωνία')
  })

  it('does not repeat the legal form its name already carries', async () => {
    configuredColumns = [ABOUT]
    legalIdentity.distinctiveTitle = ''

    const wrapper = await mountFooter(FooterDesktop)

    // No title: the legal name stays, with its form written once.
    expect(wrapper.find('address').text()).toContain('ΚΑΛΑΙΤΖΗ ΑΝΑΣΤΑΣΙΑ & ΣΙΑ Ε.Ε.')
    expect(wrapper.find('address').text()).not.toContain('Ετερόρρυθμη Εταιρεία')
  })
})

describe('webside Footer/Mobile seller identity', () => {
  // "σε εμφανές σημείο": visible without a tap, so never inside a collapsed
  // accordion column, even when the operator marked one for the desktop footer.
  it.each([
    ['a column is marked for it', [HELP, ABOUT]],
    ['no column is marked', [HELP]],
  ])('sits under the accordion, once, when %s', async (_case, columns) => {
    configuredColumns = columns

    const wrapper = await mountFooter(FooterMobile)

    expect(wrapper.findAll('address')).toHaveLength(1)
    expect(wrapper.find('address').element.closest('[data-slot="content"]')).toBeNull()
  })
})
