import { describe, it, expect, vi } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import FooterMobile from '~/components/Footer/Mobile.vue'
import WebsideFooterMobile from '~/components/variants/webside/Footer/Mobile.vue'
import { trees } from '~~/test/helpers/trees'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

mockNuxtImport('useFooterLinks', () => () => ({
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
}))

describe.each(trees(FooterMobile, WebsideFooterMobile))('$tree FooterMobile', ({ C }) => {
  /**
   * Regression: `unmountOnHide` defaults to true, so the accordion
   * dropped every closed panel's body from the DOM. Mobile devices get
   * this footer INSTEAD of the desktop one (`v-if="isMobileOrTablet"` in
   * the default layout), so under mobile-first indexing the whole footer
   * link graph was invisible to crawlers and every footer-only page —
   * terms, privacy, cookies — was orphaned.
   */
  it('renders every footer link in the DOM while the panels are collapsed', async () => {
    const wrapper = await mountSuspended(C, { route: false })

    // Still collapsed — reka-ui renders the closed bodies
    // `hidden="until-found"` instead of unmounting them.
    const panels = wrapper.findAll('[hidden]')
    expect(panels).toHaveLength(2)

    const hrefs = panels.flatMap(panel => panel.findAll('a').map(a => a.attributes('href')))
    expect(hrefs).toEqual(['/terms-of-use', '/privacy-policy', '/cookies-policy', '/contact'])
  })
})
