import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import BlogCategoriesSlider from '~/components/Blog/Categories/Slider.vue'
import WebsideBlogCategoriesSlider from '~/components/variants/webside/Blog/Categories/Slider.vue'
import { makeBlogCategory } from '~~/test/fixtures/blog'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The categories rail, in both designs. It renders the categories its band
 * hands it: the page route read them (the `blog_categories` data setting), so
 * neither rail asks for anything.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// Short names: the rail cuts a name at 10 characters (6 on a phone).
const named = (id: number, name: string) => makeBlogCategory({ id, translations: { el: { name, description: '' } } })
const CATEGORIES = [named(1, 'Νέα'), named(2, 'Συνταγές')]
const stubs = { UCarousel: { props: ['items'], template: '<div><slot v-for="item in items" :item="item" /></div>' } }

beforeEach(() => {
  setTenant()
  setTenantFeatures({ blog: true })
})

describe('Blog/Categories/Slider', () => {
  it('renders the categories it is handed, and asks for nothing', async () => {
    const wrapper = await mountSuspended(BlogCategoriesSlider, { route: false, props: { categories: CATEGORIES }, global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Νέα')
    expect(wrapper.text()).toContain('Συνταγές')
    expect(api.callsTo('/api/blog/categories')).toHaveLength(0)
  })
})

describe('webside Blog/Categories/Slider', () => {
  it('renders the categories it is handed, and asks for nothing', async () => {
    const wrapper = await mountSuspended(WebsideBlogCategoriesSlider, { route: false, props: { categories: CATEGORIES }, global: { stubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('Νέα')
    expect(wrapper.text()).toContain('Συνταγές')
    expect(api.callsTo('/api/blog/categories')).toHaveLength(0)
  })

  it('shows no more than its own width allows, however many it is handed', async () => {
    const many = Array.from({ length: 12 }, (_, index) => named(index + 1, `Κ${index + 1}`))

    const wrapper = await mountSuspended(WebsideBlogCategoriesSlider, { route: false, props: { categories: many, max: 5 }, global: { stubs } })
    await flushPromises()

    expect(wrapper.findAll('a')).toHaveLength(5)
  })
})
