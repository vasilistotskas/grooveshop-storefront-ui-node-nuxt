import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import Footer from '~/components/Chrome/variants/ekfyseosfyteias/Footer.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * «Εκ φύσεως Φυτειάς» footer. Every column is data the platform holds, so
 * what it must get right is where each one comes from and that a column
 * with nothing to show is left out:
 *
 * - address: the public offices; contact: the published phone and email;
 * - hours: consecutive days with the same hours as one line, closed days
 *   said as closed;
 * - social links: only the networks the tenant has, each with a name;
 * - the site column is the footer navigation's first columns, the legal
 *   links its rest, and "cookie settings" opens the consent preferences;
 * - the ΕΣΠΑ banner is the framed funding banner.
 */
const state = vi.hoisted(() => ({
  identity: null as { phone: string, email: string } | null,
  offices: [] as { label: string, addressLine: string }[],
  schedule: null as Record<string, { opens: string, closes: string } | null> | null,
  primary: [] as { label: string, children: { label: string, to: string }[] }[],
  secondary: [] as { label: string, to: string }[],
  logo: '/media/seal.png',
  cookieModal: { value: false },
}))

mockNuxtImport('useMerchantIdentity', () => () => ({
  identity: computed(() => state.identity),
}))
mockNuxtImport('useStoreOffices', () => () => ({
  offices: computed(() => state.offices),
}))
mockNuxtImport('useBusinessHours', () => () => ({
  hasData: computed(() => state.schedule !== null),
  schedule: computed(() => state.schedule),
}))
mockNuxtImport('useFooterNavigation', () => () => ({
  primary: computed(() => state.primary),
  secondary: computed(() => state.secondary),
}))
mockNuxtImport('useTenantBranding', () => () => ({
  logoLightUrl: computed(() => state.logo),
}))
mockNuxtImport('useCookieControl', () => () => ({
  isModalActive: computed({
    get: () => state.cookieModal.value,
    set: (value: boolean) => { state.cookieModal.value = value },
  }),
}))

const stubs = {
  TenantLogo: { template: '<img data-test="logo" alt="">' },
  ChromeFundingBanner: { props: { framed: Boolean }, template: '<div data-test="funding">{{ framed }}</div>' },
  MerchantIdentity: { template: '<address data-test="identity" />' },
}

const mountFooter = () => mountSuspended(Footer, { route: false, global: { stubs } })

/** The footer's own copy (el), which the global `$i18n` cannot reach. */
const COPY = { cookieSettings: 'Ρυθμίσεις cookies', closed: 'Κλειστά' }

const OPEN = { opens: '10:00', closes: '19:00' }
const WEEK = { mon: OPEN, tue: OPEN, wed: OPEN, thu: OPEN, fri: OPEN, sat: null, sun: null }

/** The column a heading titles, found by the heading's text. */
const column = (wrapper: VueWrapper, heading: string) =>
  wrapper.findAll('h2').find(h2 => h2.text() === heading)?.element.parentElement

describe('Chrome/variants/ekfyseosfyteias/Footer', () => {
  beforeEach(() => {
    state.identity = { phone: '698 162 7561', email: 'info@example.gr' }
    state.offices = [{ label: 'Έδρα', addressLine: 'Φυτειά Βέροιας, Τ.Θ. 80, Ημαθία' }]
    state.schedule = WEEK
    state.primary = [{ label: 'Σελίδες', children: [{ label: 'Επικοινωνία', to: '/contact' }, { label: 'Δράσεις', to: '/blog' }] }]
    state.secondary = [{ label: 'Πολιτική απορρήτου', to: '/privacy-policy' }]
    state.logo = '/media/seal.png'
    state.cookieModal.value = false
    setTenant({ storeName: 'Εκ φύσεως Φυτειάς', socialsFacebook: '', socialsInstagram: '' })
  })

  it('invites the visitor with the phone button and the seal', async () => {
    const wrapper = await mountFooter()

    expect(wrapper.find('[data-test="logo"]').exists()).toBe(true)
    expect(wrapper.find('p.italic').text()).toBe('Ελάτε να μας βρείτε στη Φυτειά.')
    const call = wrapper.findAll('a[href^="tel:"]')[0]!
    expect(call.attributes('href')).toBe('tel:6981627561')
    expect(call.text()).toContain('698 162 7561')
  })

  it('prints the public offices, the phone and the email', async () => {
    const wrapper = await mountFooter()

    expect(column(wrapper, 'Διεύθυνση')?.textContent).toContain('Φυτειά Βέροιας, Τ.Θ. 80, Ημαθία')
    const contact = column(wrapper, 'Επικοινωνία')!
    expect(contact.querySelector('a[href="tel:6981627561"]')?.textContent).toBe('698 162 7561')
    expect(contact.querySelector('a[href="mailto:info@example.gr"]')?.textContent).toBe('info@example.gr')
  })

  it('runs days with the same hours together and says closed days are closed', async () => {
    const wrapper = await mountFooter()

    const rows = [...column(wrapper, 'Ωράριο')!.querySelectorAll('li')]
      .map(li => [...li.querySelectorAll('span')].map(span => span.textContent))
    expect(rows).toEqual([['Δευτέρα – Παρασκευή', '10:00 – 19:00'], ['Σάββατο – Κυριακή', COPY.closed]])
  })

  it('leaves out a column it has nothing for', async () => {
    state.offices = []
    state.identity = null
    state.schedule = null

    const wrapper = await mountFooter()

    const headings = wrapper.findAll('h2').map(h2 => h2.text())
    expect(headings).toEqual(['Ο ιστότοπος'])
    expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
  })

  it('links only the social networks the tenant has, each by name', async () => {
    setTenant({ socialsFacebook: 'https://facebook.com/fyteia', socialsInstagram: 'https://instagram.com/fyteia' })

    const wrapper = await mountFooter()

    const socials = wrapper.findAll('a[target="_blank"]')
    expect(socials.map(link => [link.attributes('aria-label'), link.attributes('href')])).toEqual([
      ['Facebook', 'https://facebook.com/fyteia'],
      ['Instagram', 'https://instagram.com/fyteia'],
    ])
    expect(socials.every(link => link.attributes('rel') === 'noopener noreferrer')).toBe(true)
  })

  it('lists the navigation\'s pages in the site column and its legal links below', async () => {
    const wrapper = await mountFooter()

    const site = wrapper.find('nav[aria-label="Σελίδες υποσέλιδου"]')
    expect(site.findAll('a').map(link => [link.text(), link.attributes('href')]))
      .toEqual([['Επικοινωνία', '/contact'], ['Δράσεις', '/blog']])
    expect(wrapper.find('a[href="/privacy-policy"]').text()).toBe('Πολιτική απορρήτου')
  })

  it('shows the merchant identity and the framed funding banner', async () => {
    const wrapper = await mountFooter()

    expect(wrapper.find('[data-test="identity"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="funding"]').text()).toBe('true')
    expect(wrapper.text()).toContain(`© ${new Date().getFullYear()} Εκ φύσεως Φυτειάς`)
  })

  it('opens the cookie preferences', async () => {
    const wrapper = await mountFooter()
    const button = wrapper.findAll('button').find(candidate => candidate.text() === COPY.cookieSettings)!

    await button.trigger('click')

    expect(state.cookieModal.value).toBe(true)
  })
})
