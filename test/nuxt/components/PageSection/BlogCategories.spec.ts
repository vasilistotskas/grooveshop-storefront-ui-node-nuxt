import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import BlogCategories from '~/components/PageSection/BlogCategories.vue'
import { setTenant } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const CATEGORIES_URL = '/api/blog/categories'

const mountBand = () => mountSuspended(BlogCategories, {
  route: false,
  props: { title: 'Κατηγορίες' },
  global: { stubs: { BlogCategoriesSlider: { template: '<div data-test="slider" />' } } },
})

/**
 * The blog's categories as a band. It shipped with a `v-if` that checked
 * only the tenant flag, which is true on a store that has a blog and
 * nothing in it yet; on the demo store this section is FIRST, so a shop
 * with no posts opened on 80px of blank page.
 */
describe('PageSection/BlogCategories', () => {
  beforeEach(() => {
    // Cached under a fixed key (`blogCategories-slider`).
    clearNuxtData()
    setTenant({ blogEnabled: true })
    api.routes({ [CATEGORIES_URL]: { results: [{ id: 1, slug: 'news', translations: { el: { name: 'Νέα' } } }], count: 1 } })
  })

  it('draws the band once the blog has categories', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('h2').text()).toBe('Κατηγορίες')
    expect(wrapper.find('[data-test="slider"]').exists()).toBe(true)
    expect(api.callsTo(CATEGORIES_URL)[0]!.options.query).toEqual({ pageSize: 10, languageCode: 'el' })
  })

  it('draws no band when the blog has no categories', async () => {
    api.routes({ [CATEGORIES_URL]: { results: [], count: 0 } })

    const wrapper = await mountBand()

    expect(api.callsTo(CATEGORIES_URL)).toHaveLength(1)
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('asks for nothing and draws nothing when the tenant has no blog', async () => {
    setTenant({ blogEnabled: false })

    const wrapper = await mountBand()

    expect(api.callsTo(CATEGORIES_URL)).toEqual([])
    expect(wrapper.find('section').exists()).toBe(false)
  })
})
