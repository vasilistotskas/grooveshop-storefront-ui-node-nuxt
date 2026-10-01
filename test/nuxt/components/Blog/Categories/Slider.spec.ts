import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import BlogCategoriesSlider from '~/components/Blog/Categories/Slider.vue'
import WebsideBlogCategoriesSlider from '~/components/variants/webside/Blog/Categories/Slider.vue'
import { makeBlogCategory } from '~~/test/fixtures/blog'
import { trees } from '~~/test/helpers/trees'

/**
 * The categories band is a page-builder section, hydrated when it
 * scrolls into view — after the app finished hydrating, when Nuxt's
 * default `getCachedData` no longer reads the server payload. Without
 * `payloadCachedData` the band refetched what the server had already
 * rendered.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const KEY = 'blogCategories-slider'
const PAGE = { count: 2, next: null, previous: null, results: [makeBlogCategory({ id: 1 }), makeBlogCategory({ id: 2 })] }

describe.each(trees(BlogCategoriesSlider, WebsideBlogCategoriesSlider))('$tree Blog/Categories/Slider', ({ C }) => {
  beforeEach(() => {
    clearNuxtData(KEY)
    api.routes({ '/api/blog/categories': PAGE })
  })

  it('reads the server payload when it is set up after hydration, without asking again', async () => {
    const nuxtApp = useNuxtApp()
    nuxtApp.payload.data[KEY] = PAGE
    const wasHydrating = nuxtApp.isHydrating
    nuxtApp.isHydrating = false
    try {
      const wrapper = await mountSuspended(C, { route: false, global: { stubs: { UCarousel: { props: ['items'], template: '<div><slot v-for="item in items" :item="item" /></div>' } } } })
      await flushPromises()

      expect(api.callsTo('/api/blog/categories')).toHaveLength(0)
      expect(wrapper.text()).toContain('Κατηγορία')
    }
    finally {
      nuxtApp.isHydrating = wasHydrating
    }
  })
})
