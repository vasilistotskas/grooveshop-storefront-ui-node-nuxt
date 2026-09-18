import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import DemoAccountCard from '~/components/Account/DemoAccountCard.vue'

/**
 * The card publishes a working password to every visitor of the store
 * that turns it on, so the only behaviour worth pinning is when it
 * refuses to render. It fails CLOSED three times: the flag must be on
 * AND both credentials must be present.
 */
const settings = ref<Record<string, string>>({})
mockNuxtImport('useStoreSettings', () => () => ({ settings }))

const ARMED = {
  DEMO_ACCOUNT_ENABLED: 'true',
  DEMO_ACCOUNT_EMAIL: 'demo@grooveshop.space',
  DEMO_ACCOUNT_PASSWORD: 'GrooveDemo-2026',
}

mockNuxtImport('useClipboard', () => () => ({
  copy: vi.fn(),
  copied: ref(false),
}))

describe('AccountDemoAccountCard', () => {
  it('renders nothing when the store has not turned it on', async () => {
    settings.value = { ...ARMED, DEMO_ACCOUNT_ENABLED: 'false' }
    const wrapper = await mountSuspended(DemoAccountCard)

    expect(wrapper.text()).toBe('')
  })

  it('renders nothing when the flag is on but the email is missing', async () => {
    // Half-configured is not configured: the button would sign in with
    // an empty address and the card would promise an account that is
    // not there.
    settings.value = { ...ARMED, DEMO_ACCOUNT_EMAIL: '' }
    const wrapper = await mountSuspended(DemoAccountCard)

    expect(wrapper.text()).toBe('')
  })

  it('renders nothing when the password is missing', async () => {
    settings.value = { ...ARMED, DEMO_ACCOUNT_PASSWORD: '' }
    const wrapper = await mountSuspended(DemoAccountCard)

    expect(wrapper.text()).toBe('')
  })

  it('shows both credentials in clear once armed', async () => {
    settings.value = { ...ARMED }
    const wrapper = await mountSuspended(DemoAccountCard)

    const values = wrapper.findAll('input').map(i => (i.element as HTMLInputElement).value)
    expect(values).toContain('demo@grooveshop.space')
    expect(values).toContain('GrooveDemo-2026')
  })

  it('hands the credentials up rather than signing in itself', async () => {
    // One login path: the form owns the pending two-factor flow, the
    // cart refresh and the `next` bookkeeping.
    settings.value = { ...ARMED }
    const wrapper = await mountSuspended(DemoAccountCard)

    const button = wrapper.findAll('button').at(-1)
    await button?.trigger('click')

    expect(wrapper.emitted('login')?.[0]).toEqual([{
      email: 'demo@grooveshop.space',
      password: 'GrooveDemo-2026',
    }])
  })
})
