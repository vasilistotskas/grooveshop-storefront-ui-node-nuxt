import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogCategories from '~/components/PageSection/BlogCategories.vue'
import { makeBlogCategory } from '~~/test/fixtures/blog'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/** The `categories` data setting as the page route hands it over. */
const categories = (ids: number[]) => ({
  status: ids.length ? 'ok' : 'empty',
  items: ids.map(id => makeBlogCategory({ id, translations: { el: { name: `Νέα ${id}` } } as BlogCategory['translations'] })),
  total: ids.length,
  descriptor: { limit: 10 },
}) as ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>

const mountBand = (props: Record<string, unknown> = {}, stubs: Record<string, object> = { BlogCategoriesSlider: { template: '<div data-test="slider" />' } }) =>
  mountSuspended(BlogCategories, {
    route: false,
    props: { title: 'Κατηγορίες', categories: categories([1]), ...props },
    global: { stubs },
  })

/**
 * The blog's categories as a band. It shipped with a `v-if` that checked
 * only the tenant flag, which is true on a store that has a blog and
 * nothing in it yet; on the demo store this section is FIRST, so a shop
 * with no posts opened on 80px of blank page. The categories arrive read
 * (the page route resolved them), so the band fetches nothing.
 */
describe('PageSection/BlogCategories', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ blog: true })
  })

  it('draws the band once the blog has categories', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('h2').text()).toBe('Κατηγορίες')
    expect(wrapper.find('[data-test="slider"]').exists()).toBe(true)
  })

  it('hands the rail the categories it was given', async () => {
    const wrapper = await mountBand({}, { UCarousel: { props: ['items'], template: '<div><slot v-for="item in items" :item="item" /></div>' } })

    expect(wrapper.text()).toContain('Νέα 1')
  })

  it('draws no band when the blog has no categories', async () => {
    const wrapper = await mountBand({ categories: categories([]) })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
