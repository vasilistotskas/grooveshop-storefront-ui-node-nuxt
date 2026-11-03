import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import DemoAccountCard from '~/components/Account/DemoAccountCard.vue'
import { makePublicValues } from '~~/test/fixtures/publicValues'
import { setTenant, setTenantPreferences } from '~~/test/helpers/tenant'

/**
 * The strip publishes a working password to every visitor of the store
 * that turns it on, so the first thing to pin is when it refuses to
 * render: it fails CLOSED — the store's `demoAccount` preference must be
 * on AND both of an account's credentials must be present. Then that each row's "Sign in"
 * hands up the pair it stands for, and that the password is masked and
 * copyable, never printed.
 */
const values = ref(makePublicValues())
mockNuxtImport('useStoreSettings', () => () => ({ values }))

const copied = ref(false)
const { copy } = vi.hoisted(() => ({ copy: vi.fn((_text: string) => Promise.resolve()) }))
mockNuxtImport('useClipboard', () => () => ({ copy, copied }))

const ARMED = {
  demoAccountEmail: 'demo@grooveshop.space',
  demoAccountPassword: 'GrooveDemo-2026',
}
const WHOLESALE = {
  demoAccountB2bEmail: 'demo-wholesale@grooveshop.space',
  demoAccountB2bPassword: 'GrooveWholesale-2026',
}

beforeEach(() => {
  setTenant()
  setTenantPreferences({ demoAccount: true })
  values.value = makePublicValues({ ...ARMED })
  copied.value = false
  copy.mockImplementation(() => {
    copied.value = true
    return Promise.resolve()
  })
})

const mountStrip = (props: { loading?: boolean } = {}) => mountSuspended(DemoAccountCard, { props, route: false })
const signInButtons = (wrapper: VueWrapper) => wrapper.findAll('button').filter(button => button.text() === 'Σύνδεση')
const rowNames = (wrapper: VueWrapper) => wrapper.findAll('strong').map(name => name.text())

describe('Account/DemoAccountCard', () => {
  it('renders nothing when the store has not turned it on', async () => {
    setTenantPreferences({ demoAccount: false })

    const wrapper = await mountStrip()

    expect(wrapper.text()).toBe('')
  })

  it.each([
    // Half-configured is not configured: the button would sign in with an
    // empty address and promise an account that is not there.
    ['the email is missing', { demoAccountEmail: '' }],
    ['the password is missing', { demoAccountPassword: '' }],
  ])('renders nothing when %s', async (_case, override) => {
    values.value = makePublicValues({ ...ARMED, ...override })

    const wrapper = await mountStrip()

    expect(wrapper.text()).toBe('')
  })

  it('offers each configured account as a row with its email, its password masked', async () => {
    values.value = makePublicValues({ ...ARMED, ...WHOLESALE })

    const wrapper = await mountStrip()

    expect(rowNames(wrapper)).toEqual(['Πελάτης', 'Χονδρική'])
    expect(wrapper.text()).toContain('demo@grooveshop.space')
    expect(wrapper.text()).toContain('demo-wholesale@grooveshop.space')
    // Masked on screen: a second pair of credentials in clear above the
    // real form read as another login form.
    expect(wrapper.text()).not.toContain('GrooveDemo-2026')
    expect(wrapper.text()).not.toContain('GrooveWholesale-2026')
    expect(signInButtons(wrapper).map(button => button.attributes('aria-label')))
      .toEqual(['Σύνδεση ως πελάτης', 'Σύνδεση ως πελάτης χονδρικής'])
  })

  it('ignores a half-configured wholesale account', async () => {
    values.value = makePublicValues({ ...ARMED, ...WHOLESALE, demoAccountB2bPassword: '' })

    const wrapper = await mountStrip()

    expect(rowNames(wrapper)).toEqual(['Πελάτης'])
    expect(wrapper.text()).not.toContain('demo-wholesale@grooveshop.space')
  })

  it('offers a wholesale-only store its wholesale row', async () => {
    values.value = makePublicValues({ ...WHOLESALE })

    const wrapper = await mountStrip()

    expect(rowNames(wrapper)).toEqual(['Χονδρική'])
  })

  it.each([
    [0, { email: 'demo@grooveshop.space', password: 'GrooveDemo-2026' }],
    [1, { email: 'demo-wholesale@grooveshop.space', password: 'GrooveWholesale-2026' }],
  ])('hands up the pair of row %i rather than signing in itself', async (index, credentials) => {
    // One login path: the form owns the pending two-factor flow, the
    // cart refresh and the `next` bookkeeping.
    values.value = makePublicValues({ ...ARMED, ...WHOLESALE })
    const wrapper = await mountStrip()

    await signInButtons(wrapper)[index]!.trigger('click')

    expect(wrapper.emitted('login')).toEqual([[credentials]])
  })

  it('copies the row\'s password and marks only that row as copied', async () => {
    values.value = makePublicValues({ ...ARMED, ...WHOLESALE })
    const wrapper = await mountStrip()
    const shopperCopy = wrapper.get('button[aria-label="Αντιγραφή του κωδικού πελάτη"]')
    const wholesaleCopy = wrapper.get('button[aria-label="Αντιγραφή του κωδικού χονδρικής"]')

    await wholesaleCopy.trigger('click')

    expect(copy).toHaveBeenCalledWith('GrooveWholesale-2026')
    expect(wholesaleCopy.html()).toContain('i-lucide:check')
    expect(shopperCopy.html()).toContain('i-lucide:copy')
  })

  it('shows the sign-in buttons busy while the form signs in', async () => {
    const wrapper = await mountStrip({ loading: true })

    expect(signInButtons(wrapper)[0]!.attributes('disabled')).toBeDefined()
  })
})
