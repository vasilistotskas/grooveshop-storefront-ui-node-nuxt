import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PageBreadcrumb from '~/components/Page/Breadcrumb.vue'
import WebsidePageBreadcrumb from '~/components/variants/webside/Page/Breadcrumb.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * Labels come from the real `i18n/locales/breadcrumb` catalogue, so the
 * crumbs are asserted through `$i18n.t` rather than as literal Greek.
 * The current crumb links to `route.path`, so these mount on a real
 * route instead of mocking the router (an incomplete router mock breaks
 * Nuxt's own plugins).
 */
function label(key: string) {
  return useNuxtApp().$i18n.t(`breadcrumb.items.${key}.label`)
}

describe.each(trees(PageBreadcrumb, WebsidePageBreadcrumb))('$tree PageBreadcrumb', ({ tree, C }) => {
  it('links Home to the index and marks the current page', async () => {
    const wrapper = await mountSuspended(C, { route: '/about', props: { routeName: 'about' } })

    const links = wrapper.findAll('a')
    expect(links.map(a => [a.text(), a.attributes('href')])).toEqual([
      [label('index'), '/'],
      [label('about'), '/about'],
    ])
    expect(links[1]!.attributes('aria-current')).toBe('page')
    expect(links[0]!.attributes('aria-current')).toBeUndefined()
  })

  it('looks the label up by the route base name when no routeName is given', async () => {
    const wrapper = await mountSuspended(C, { route: '/contact' })

    expect(wrapper.find('[aria-current="page"]').text()).toBe(label('contact'))
  })

  it.each(['feedback', 'vision', 'blog-categories'])('resolves the %s crumb from the catalogue', async (name) => {
    const wrapper = await mountSuspended(C, { route: false, props: { routeName: name } })

    expect(wrapper.find('[aria-current="page"]').text()).toBe(label(name))
  })

  // A category page walks its ancestors: Home, the listing, each parent,
  // then the category itself, which links to the page it is on.
  it.runIf(tree === 'default')('walks the trail a page names, the last crumb current', async () => {
    const wrapper = await mountSuspended(C, {
      route: '/products/category/3/cables',
      props: { items: [
        { label: 'Products', to: '/products' },
        { label: 'Charging', to: '/products/category/2/charging' },
        { label: 'Cables' },
      ] },
    })

    const links = wrapper.findAll('a')
    expect(links.map(a => [a.text(), a.attributes('href')])).toEqual([
      [label('index'), '/'],
      ['Products', '/products'],
      ['Charging', '/products/category/2/charging'],
      ['Cables', '/products/category/3/cables'],
    ])
    expect(wrapper.findAll('[aria-current="page"]').map(a => a.text())).toEqual(['Cables'])
  })

  it('renders nothing when the route has no catalogue entry', async () => {
    const wrapper = await mountSuspended(C, {
      route: false,
      props: { routeName: 'route-with-no-crumb-label' },
    })

    // Never paint a raw `breadcrumb.items.*.label` key on the page.
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
