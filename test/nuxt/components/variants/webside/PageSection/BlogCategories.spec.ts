import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogCategories from '~/components/variants/webside/PageSection/BlogCategories.vue'
import { makeBlogCategory } from '~~/test/fixtures/blog'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Webside keeps its own slider for `blog_categories` (pinned by its
 * design-render snapshot), and hands the `tiles` layout to the platform's
 * band, so webside gets the tiles drawn in its theme with no markup of its
 * own.
 */
const categories = {
  status: 'ok',
  items: [makeBlogCategory({ id: 1 })],
  total: 1,
  descriptor: { limit: 10 },
} as ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>

const stubs = {
  WebsideBlogCategoriesSlider: { template: '<div data-test="webside-slider" />' },
  PageSectionBlogCategoryTiles: { props: ['title', 'categories'], template: '<div data-test="tiles" :data-title="title" />' },
}

const mountBand = (props: Record<string, unknown>) =>
  mountSuspended(BlogCategories, { route: false, props: { categories, ...props }, global: { stubs } })

describe('webside blog_categories', () => {
  beforeEach(() => {
    setTenant({ schemaName: 'webside' })
  })

  it.each([undefined, 'slider'])('draws webside\'s own slider for layout %j', async (layout) => {
    const wrapper = await mountBand({ layout, title: 'Θέματα' })

    expect(wrapper.findAll('[data-test="webside-slider"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="tiles"]').exists()).toBe(false)
  })

  // Webside's production home sets none of these: its render must stay the
  // bare slider (pinned by the design-render snapshot too).
  it('draws the bare slider, with no band around it, when nothing of the band is set', async () => {
    const wrapper = await mountBand({ ctaText: 'Όλα' })

    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.find('h2').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="webside-slider"]')).toHaveLength(1)
  })

  it('draws the slider in the shared band with the title, the sub-line and the call to action set', async () => {
    const wrapper = await mountBand({ title: 'Θέματα', subheading: 'Σύντομα άρθρα.', ctaText: 'Όλα τα άρθρα', ctaLink: '/blog' })

    const band = wrapper.get('section')
    expect(band.get('h2').text()).toBe('Θέματα')
    expect(band.text()).toContain('Σύντομα άρθρα.')
    expect(band.get('a[href="/blog"]').text()).toContain('Όλα τα άρθρα')
    expect(band.findAll('[data-test="webside-slider"]')).toHaveLength(1)
  })

  it.each([
    ['a sub-line alone', { subheading: 'Σύντομα άρθρα.' }],
    ['a call to action alone', { ctaText: 'Όλα τα άρθρα', ctaLink: '/blog' }],
  ])('draws the band for %s', async (_, props) => {
    const wrapper = await mountBand(props)

    expect(wrapper.get('section').findAll('[data-test="webside-slider"]')).toHaveLength(1)
  })

  it('hands the tiles layout to the platform\'s band', async () => {
    const wrapper = await mountBand({ layout: 'tiles', title: 'Θέματα' })

    expect(wrapper.find('[data-test="webside-slider"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="tiles"]').attributes('data-title')).toBe('Θέματα')
  })
})
