import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import DemoAccountCard from '~/components/Account/DemoAccountCard.vue'

/**
 * The card publishes a working password to every visitor of the store
 * that turns it on, so the first thing to pin is when it refuses to
 * render: it fails CLOSED — the flag must be on AND both of an
 * account's credentials must be present. Then that the button signs in
 * with the pair it stands for.
 */
const settings = ref<Record<string, string>>({})
mockNuxtImport('useStoreSettings', () => () => ({ settings }))

const copied = ref(false)
const { copy } = vi.hoisted(() => ({ copy: vi.fn((_text: string) => Promise.resolve()) }))
mockNuxtImport('useClipboard', () => () => ({ copy, copied }))

const ARMED = {
  DEMO_ACCOUNT_ENABLED: 'true',
  DEMO_ACCOUNT_EMAIL: 'demo@grooveshop.space',
  DEMO_ACCOUNT_PASSWORD: 'GrooveDemo-2026',
}
const WHOLESALE = {
  DEMO_ACCOUNT_B2B_EMAIL: 'demo-wholesale@grooveshop.space',
  DEMO_ACCOUNT_B2B_PASSWORD: 'GrooveWholesale-2026',
}

beforeEach(() => {
  settings.value = { ...ARMED }
  copied.value = false
  copy.mockImplementation(() => {
    copied.value = true
    return Promise.resolve()
  })
})

const mountCard = (props: { loading?: boolean } = {}) => mountSuspended(DemoAccountCard, { props, route: false })
/** The sign-in buttons: the copy buttons are the ones with an aria-label. */
const signInButtons = (wrapper: VueWrapper) => wrapper.findAll('button').filter(button => !button.attributes('aria-label'))
const copyButtons = (wrapper: VueWrapper) => wrapper.findAll('button[aria-label="Αντιγραφή"]')

describe('Account/DemoAccountCard', () => {
  it.each([
    ['the store has not turned it on', { DEMO_ACCOUNT_ENABLED: 'false' }],
    // Half-configured is not configured: the button would sign in with an
    // empty address and promise an account that is not there.
    ['the email is missing', { DEMO_ACCOUNT_EMAIL: '' }],
    ['the password is missing', { DEMO_ACCOUNT_PASSWORD: '' }],
  ])('renders nothing when %s', async (_case, override) => {
    settings.value = { ...ARMED, ...override }

    const wrapper = await mountCard()

    expect(wrapper.text()).toBe('')
  })

  it('offers one unlabelled retail account with its credentials in clear', async () => {
    const wrapper = await mountCard()

    // Credentials are a copyable line, not form fields: two labelled
    // email+password pairs above the real login form read as three forms.
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual(['demo@grooveshop.space', 'GrooveDemo-2026'])
    expect(signInButtons(wrapper).map(button => button.text())).toEqual(['Σύνδεση ως επισκέπτης δοκιμής'])
    // One account needs no heading over it.
    expect(wrapper.text()).not.toContain('Λιανική')
  })

  it('labels both accounts, each with its own sign-in button, when a wholesale one is set', async () => {
    settings.value = { ...ARMED, ...WHOLESALE }

    const wrapper = await mountCard()

    expect(wrapper.findAll('p.uppercase').map(label => label.text())).toEqual(['Λιανική', 'Χονδρική'])
    expect(signInButtons(wrapper).map(button => button.text())).toEqual([
      'Σύνδεση ως πελάτης λιανικής',
      'Σύνδεση ως πελάτης χονδρικής',
    ])
    expect(wrapper.findAll('dd').map(cell => cell.text())).toEqual([
      'demo@grooveshop.space',
      'GrooveDemo-2026',
      'demo-wholesale@grooveshop.space',
      'GrooveWholesale-2026',
    ])
  })

  it('ignores a half-configured wholesale account', async () => {
    // Same fail-closed rule: a button that signs in with an empty
    // password is worse than no second account.
    settings.value = { ...ARMED, ...WHOLESALE, DEMO_ACCOUNT_B2B_PASSWORD: '' }

    const wrapper = await mountCard()

    expect(wrapper.text()).not.toContain('demo-wholesale@grooveshop.space')
    expect(signInButtons(wrapper)).toHaveLength(1)
  })

  it('offers a wholesale-only store its one account, unlabelled', async () => {
    settings.value = { DEMO_ACCOUNT_ENABLED: 'true', ...WHOLESALE }

    const wrapper = await mountCard()
    await signInButtons(wrapper)[0]!.trigger('click')

    expect(signInButtons(wrapper).map(button => button.text())).toEqual(['Σύνδεση ως επισκέπτης δοκιμής'])
    expect(wrapper.emitted('login')).toEqual([[{
      email: 'demo-wholesale@grooveshop.space',
      password: 'GrooveWholesale-2026',
    }]])
  })

  it.each([
    [0, { email: 'demo@grooveshop.space', password: 'GrooveDemo-2026' }],
    [1, { email: 'demo-wholesale@grooveshop.space', password: 'GrooveWholesale-2026' }],
  ])('hands up the pair of sign-in button %i rather than signing in itself', async (index, credentials) => {
    // One login path: the form owns the pending two-factor flow, the
    // cart refresh and the `next` bookkeeping.
    settings.value = { ...ARMED, ...WHOLESALE }
    const wrapper = await mountCard()

    await signInButtons(wrapper)[index]!.trigger('click')

    expect(wrapper.emitted('login')).toEqual([[credentials]])
  })

  it('copies the field asked for and marks only that one as copied', async () => {
    const wrapper = await mountCard()
    const [emailCopy, passwordCopy] = copyButtons(wrapper)

    await passwordCopy!.trigger('click')

    expect(copy).toHaveBeenCalledWith('GrooveDemo-2026')
    expect(passwordCopy!.html()).toContain('i-heroicons:check')
    expect(emailCopy!.html()).toContain('i-heroicons:clipboard-document')
  })

  it('shows the sign-in buttons busy while the form signs in', async () => {
    const wrapper = await mountCard({ loading: true })

    expect(signInButtons(wrapper)[0]!.attributes('disabled')).toBeDefined()
  })
})
