import { beforeEach, describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Navbar from '~/components/variants/webside/Page/Navbar.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The frozen webside navbar's gift-card link follows the gated-routes
 * table (`shared/utils/gatedRoutes.ts`): gift cards are bought from the
 * catalogue, so a store with the catalogue off links to a 404 otherwise.
 * Its markup is pinned by `frozen-render.spec.ts`.
 */
mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => null),
  footerColumns: computed(() => null),
  mobileLinks: computed(() => null),
}))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const linkTargets = async () => {
  const wrapper = await mountSuspended(Navbar, { route: false })
  const hrefs = wrapper.findAll('nav a').map(a => a.attributes('href'))
  wrapper.unmount()
  return hrefs
}

describe('webside Page/Navbar gift-card link', () => {
  beforeEach(() => {
    setTenant({ availableLocales: ['el'] })
  })

  it.each([
    { name: 'gift cards and the catalogue are on', features: { giftCards: true, catalogue: true }, linked: true },
    { name: 'the catalogue is off', features: { giftCards: true, catalogue: false }, linked: false },
    { name: 'gift cards are off', features: { giftCards: false, catalogue: true }, linked: false },
  ])('is linked: $linked when $name', async ({ features, linked }) => {
    setTenantFeatures(features)

    expect((await linkTargets()).includes('/gift-cards')).toBe(linked)
  })
})
