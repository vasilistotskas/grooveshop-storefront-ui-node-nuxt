import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import WebsideProductGuestLoyaltyCTA from '~/components/variants/webside/Product/GuestLoyaltyCTA.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * Webside's sign-up nudge under the price: the points the product earns,
 * as Django works them out.
 */
describe('webside Product/GuestLoyaltyCTA', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ loyalty: true })
  })

  const mount = (potentialPoints: number) =>
    mountSuspended(WebsideProductGuestLoyaltyCTA, { props: { potentialPoints }, route: false })

  it('offers the points the product earns, and links to sign-up', async () => {
    const wrapper = await mount(24)

    expect(wrapper.text()).toContain('+24')
    expect(wrapper.text()).toContain('Κέρδισε 24 πόντους')
    // And back to the page it is on once signed up (here `/`).
    expect(wrapper.find('a').attributes('href')).toBe('/account/signup?next=/')
  })

  it('renders nothing when the product earns no points', async () => {
    const wrapper = await mount(0)

    expect(wrapper.text()).toBe('')
  })

  it('renders nothing on a store without the loyalty feature', async () => {
    setTenantFeatures({ loyalty: false })

    const wrapper = await mount(24)

    expect(wrapper.text()).toBe('')
  })
})
