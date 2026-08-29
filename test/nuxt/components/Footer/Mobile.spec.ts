import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import FooterMobile from '~/components/Footer/Mobile.vue'

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(() => Promise.resolve({})),
}))
mockNuxtImport('$fetch', () => mockFetch)

mockNuxtImport('useFooterLinks', () => {
  return () => ({
    columns: computed(() => [
      {
        label: 'Όροι & Προϋποθέσεις',
        icon: 'i-heroicons-rectangle-group',
        children: [
          { label: 'Όροι Χρήσης', to: '/terms-of-use' },
          { label: 'Πολιτική Απορρήτου', to: '/privacy-policy' },
          { label: 'Πολιτική Cookies', to: '/cookies-policy' },
        ],
      },
      {
        label: 'Κέντρο Βοήθειας',
        icon: 'i-heroicons-chat-bubble-left-right',
        children: [{ label: 'Επικοινωνία', to: '/contact' }],
      },
    ]),
  })
})

describe('FooterMobile', () => {
  /**
   * Regression: `unmountOnHide` defaults to true, so the accordion
   * dropped every closed panel's body from the DOM. Mobile devices get
   * this footer INSTEAD of the desktop one (`v-if="isMobileOrTablet"` in
   * the default layout), so under mobile-first indexing the whole footer
   * link graph was invisible to crawlers and every footer-only page —
   * terms, privacy, cookies — was orphaned.
   */
  it('renders every footer link in the DOM while the panels are collapsed', async () => {
    const wrapper = await mountSuspended(FooterMobile)

    // Still collapsed — the panels are hidden, they are just no longer
    // unmounted (reka-ui renders them `hidden="until-found"`).
    expect(wrapper.findAll('[hidden]').length).toBeGreaterThan(0)

    const hrefs = wrapper.findAll('a').map(a => a.attributes('href'))
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/terms-of-use',
        '/privacy-policy',
        '/cookies-policy',
        '/contact',
      ]),
    )
  })
})
