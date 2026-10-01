import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import BlogCategoriesSlider from '~/components/Blog/Categories/Slider.vue'
import WebsideBlogCategoriesSlider from '~/components/variants/webside/Blog/Categories/Slider.vue'
import { makeBlogCategory } from '~~/test/fixtures/blog'

/**
 * The categories rail. The default rail renders the categories its band
 * hands it — the band is the one fetcher of them. The frozen webside rail
 * still fetches its own, inside a band hydrated when it scrolls into
 * view: after the app finished hydrating, when Nuxt's default
 * `getCachedData` no longer reads the server payload, so without
 * `payloadCachedData` it refetched what the server had rendered.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const KEY = 'blogCategories-slider'
// Short names: the rail cuts a name at 10 characters (6 on a phone).
const named = (id: number, name: string) => makeBlogCategory({ id, translations: { el: { name, description: '' } } })
const CATEGORIES = [named(1, 'Νέα'), named(2, 'Συνταγές')]
const PAGE = { count: 2, next: null, previous: null, results: CATEGORIES }
const stubs = { UCarousel: { props: ['items'], template: '<div><slot v-for="item in items" :item="item" /></div>' } }

beforeEach(() => {
  clearNuxtData(KEY)
  api.routes({ '/api/blog/categories': PAGE })
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
  it('reads the server payload when it is set up after hydration, without asking again', async () => {
    const nuxtApp = useNuxtApp()
    nuxtApp.payload.data[KEY] = PAGE
    const wasHydrating = nuxtApp.isHydrating
    nuxtApp.isHydrating = false
    try {
      const wrapper = await mountSuspended(WebsideBlogCategoriesSlider, { route: false, global: { stubs } })
      await flushPromises()

      expect(api.callsTo('/api/blog/categories')).toHaveLength(0)
      expect(wrapper.text()).toContain('Συνταγές')
    }
    finally {
      nuxtApp.isHydrating = wasHydrating
    }
  })
})
