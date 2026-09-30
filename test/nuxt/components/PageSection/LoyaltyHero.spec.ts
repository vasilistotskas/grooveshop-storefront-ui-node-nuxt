import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoyaltyHero from '~/components/PageSection/LoyaltyHero.vue'
import { setTenant } from '~~/test/helpers/tenant'

const session = vi.hoisted(() => ({ loggedIn: undefined as any }))
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  return {
    loggedIn: session.loggedIn,
    user: ref(null),
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

/**
 * The hero fetches the member's summary itself, so it is stubbed. It is
 * a `Lazy` component: the stub matches the component its async wrapper
 * resolves, so the test waits for that import — which also keeps it
 * from landing after the environment is torn down (an unhandled
 * `EnvironmentTeardownError` once did exactly that).
 */
const HeroStub = { template: '<div data-test="hero" />' }
async function mountBand() {
  const wrapper = await mountSuspended(LoyaltyHero, {
    route: false,
    props: { title: 'Οι πόντοι σου' },
    global: { stubs: { LoyaltyProgressHero: HeroStub } },
  })
  await flushPromises()
  return wrapper
}

/**
 * The band paints only for a signed-in member of a store that runs a
 * programme: the hero renders nothing for a guest, so a band that only
 * checked the tenant flag left an empty strip on every anonymous visit.
 */
describe('PageSection/LoyaltyHero', () => {
  beforeEach(() => {
    session.loggedIn && (session.loggedIn.value = true)
    setTenant({ loyaltyEnabled: true })
  })

  it('draws the band for a member', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('h2').text()).toBe('Οι πόντοι σου')
    await vi.waitFor(() => expect(wrapper.find('[data-test="hero"]').exists()).toBe(true))
  })

  it('draws no band for a guest, however the programme is set', async () => {
    session.loggedIn.value = false

    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('draws no band for a member of a store without a programme', async () => {
    setTenant({ loyaltyEnabled: false })

    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
