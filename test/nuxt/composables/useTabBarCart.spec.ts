import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { setTenant, setTenantPreferences } from '~~/test/helpers/tenant'
import WebsideBuilderNavbar from '~/components/variants/webside/Builder/Navbar.vue'

/**
 * A shopper always has one way to the cart on a phone. The tab bar draws its
 * Cart tab except on account pages; webside's header draws its own cart
 * button exactly where the tab bar does not (2026-11-13 review: the header
 * hid it whenever a tab bar was on, so account pages had none).
 */
const device = vi.hoisted(() => ({ mobile: { value: true } }))
mockNuxtImport('useDevice', () => () => ({ isMobileOrTablet: device.mobile, isMobile: device.mobile, isDesktop: { value: false } }))

const Probe = defineComponent({
  setup() {
    const tabBarCart = useTabBarCart()
    return () => h('output', String(tabBarCart.value))
  },
})

const cartButtons = async (route: string) => {
  const wrapper = await mountSuspended(WebsideBuilderNavbar, { route })
  return wrapper.findAll('a[href="/cart"]').length
}

describe('useTabBarCart', () => {
  beforeEach(() => {
    device.mobile.value = true
    setTenant({ schemaName: 'webside' })
  })

  it.each([
    ['a shop page with the tab bar on', '/products', true, 'true'],
    ['an account page with the tab bar on', '/account', true, 'false'],
    ['a shop page with the tab bar off', '/products', false, 'false'],
  ])('answers whether the tab bar carries the cart on %s', async (_case, route, tabBar, expected) => {
    setTenantPreferences({ mobileBottomNav: tabBar })

    const wrapper = await mountSuspended(Probe, { route })

    expect(wrapper.text()).toBe(expected)
  })

  it.each([
    ['an account page, where the tab bar has no Cart tab', '/account', true, 1],
    ['a shop page, where the tab bar has it', '/products', true, 0],
    ['any page without a tab bar', '/products', false, 1],
  ])('draws the cart in webside’s phone header on %s', async (_case, route, tabBar, count) => {
    setTenantPreferences({ mobileBottomNav: tabBar })

    expect(await cartButtons(route)).toBe(count)
  })
})
