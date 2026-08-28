import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PageBreadcrumb from '~/components/Page/Breadcrumb.vue'

// The `routeName` prop drives the catalogue lookup, so these run
// against the real i18n catalogue without mocking useRoute/useRouter
// (an incomplete router mock breaks Nuxt's own plugins).
describe('PageBreadcrumb', () => {
  it('builds Home → current page from the shared catalogue', async () => {
    const wrapper = await mountSuspended(PageBreadcrumb, {
      props: { routeName: 'about' },
    })

    // Real Greek messages: 'Αρχική' (index) then the about label.
    expect(wrapper.text()).toContain('Αρχική')
    expect(wrapper.text()).toContain('Σχετικά')
    expect(wrapper.findAll('a').length).toBeGreaterThan(0)
  })

  it('resolves every route that ships a page-level breadcrumb', async () => {
    for (const [name, label] of [
      ['contact', 'Επικοινωνία'],
      ['feedback', 'Σχόλια'],
      ['vision', 'Όραμα'],
      ['blog-categories', 'Κατηγορίες'],
    ] as const) {
      const wrapper = await mountSuspended(PageBreadcrumb, {
        props: { routeName: name },
      })
      expect(wrapper.text(), name).toContain(label)
    }
  })

  it('renders nothing when the route has no catalogue entry', async () => {
    const wrapper = await mountSuspended(PageBreadcrumb, {
      props: { routeName: 'route-with-no-crumb-label' },
    })

    // Never paint a raw `breadcrumb.items.*.label` key on the page.
    expect(wrapper.text()).not.toContain('breadcrumb.items')
    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
