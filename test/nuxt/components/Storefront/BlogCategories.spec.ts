import { describe, it, expect } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import { resolve } from 'node:path'
import YAML from 'yaml'
import BlogCategories from '~/components/Storefront/BlogCategories.vue'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The blog's categories page: Blog › Categories, the heading and its
 * lead, then the category grid (its own component and spec).
 */
mockComponent('BlogCategoriesList', { template: '<div data-stub="grid" />' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/BlogCategories.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

describe('Storefront/BlogCategories', () => {
  it('has a visible h1 with its lead, then the grid', async () => {
    const wrapper = await mountSuspended(BlogCategories, { route: false })

    expect(wrapper.get('h1').text()).toBe(messages.title)
    expect(wrapper.text()).toContain(messages.lead)
    expect(wrapper.find('[data-stub="grid"]').exists()).toBe(true)
  })

  it('has Blog as a link back above the current page', async () => {
    const wrapper = await mountSuspended(BlogCategories, { route: false })

    expect(wrapper.findAll('nav a').map(link => [link.text(), link.attributes('href')])).toContainEqual([messages.breadcrumb.blog, '/blog'])
  })
})
