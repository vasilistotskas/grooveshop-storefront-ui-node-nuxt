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

    expect(wrapper.find('[data-test="webside-slider"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="tiles"]').exists()).toBe(false)
  })

  it('hands the tiles layout to the platform\'s band', async () => {
    const wrapper = await mountBand({ layout: 'tiles', title: 'Θέματα' })

    expect(wrapper.find('[data-test="webside-slider"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="tiles"]').attributes('data-title')).toBe('Θέματα')
  })
})
