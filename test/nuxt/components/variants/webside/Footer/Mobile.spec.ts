import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import FooterMobile from '~/components/variants/webside/Footer/Mobile.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * webside's phone footer: one solid accent bar per column, as the design
 * board draws it, the label at the left and the chevron at the right, with
 * no leading icon. The columns are the code-level ones (`useFooterLinks`),
 * which carry an icon each: the bars must not draw it.
 */
registerEndpoint('/api/tenant/legal-identity', () => ({ name: 'Webside' }))
registerEndpoint('/api/content-pages', () => ({ count: 0, next: null, previous: null, results: [] }))

describe('webside Footer/Mobile', () => {
  beforeEach(() => {
    setTenant({ schemaName: 'webside' })
    setTenantFeatures({ cart: false })
  })

  it('draws each column as a bar with its label and a chevron, and no leading icon', async () => {
    const wrapper = await mountSuspended(FooterMobile, { route: false })

    const bars = wrapper.findAll('[data-slot="trigger"]')
    expect(bars.length).toBeGreaterThan(0)
    for (const bar of bars) {
      expect(bar.find('[data-slot="leadingIcon"]').exists()).toBe(false)
      expect(bar.find('[data-slot="trailingIcon"]').exists()).toBe(true)
      expect(bar.get('[data-slot="label"]').text()).not.toBe('')
    }
  })
})
