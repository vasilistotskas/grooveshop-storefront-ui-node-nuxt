import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { makeBlogCategory } from '~~/test/fixtures/blog'
import { failWith } from '~~/test/helpers/api'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const CATEGORIES_URL = '/api/blog/categories'

const page = (results: ReturnType<typeof makeBlogCategory>[]) => ({ count: results.length, next: null, previous: null, results })

async function menu() {
  let result!: ReturnType<typeof useBlogCategoryMenu>
  await mountSuspended(defineComponent({
    async setup() {
      result = useBlogCategoryMenu()
      await useBlogCategories().request
      return () => h('div')
    },
  }), { route: false })
  return result
}

/**
 * The blog's topics as the header's Blog dropdown and the phone menus
 * list them: the top-level topics, capped, each with its page and post
 * count, from the one blog-category reader.
 */
describe('useBlogCategoryMenu', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant()
    setTenantFeatures({ blog: true })
  })

  it('lists the top-level topics with their page, picture and post count', async () => {
    api.routes({
      [CATEGORIES_URL]: page([
        makeBlogCategory({ id: 1, slug: 'mobile', postCount: 26, mainImagePath: 'media/uploads/blog/mobile.png', translations: { el: { name: 'Κινητό' } } }),
        makeBlogCategory({ id: 2, slug: 'android', parent: 1, level: 1 }),
        makeBlogCategory({ id: 3, slug: 'ai', postCount: 14, translations: { el: { name: 'AI' } } }),
      ]),
    })

    const { blogCategories, hasBlogCategories } = await menu()

    expect(hasBlogCategories.value).toBe(true)
    expect(blogCategories.value).toEqual([
      { id: 1, label: 'Κινητό', to: '/blog/category/1/mobile', imagePath: 'media/uploads/blog/mobile.png', postCount: 26 },
      { id: 3, label: 'AI', to: '/blog/category/3/ai', imagePath: '', postCount: 14 },
    ])
  })

  it('lists at most eight topics: "all articles" carries the rest', async () => {
    api.routes({ [CATEGORIES_URL]: page(Array.from({ length: 10 }, (_, i) => makeBlogCategory({ id: i + 1 }))) })

    const { blogCategories } = await menu()

    expect(blogCategories.value.map(topic => topic.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('is empty, and asks for nothing, when the store has no blog', async () => {
    setTenantFeatures({ blog: false })
    api.routes({ [CATEGORIES_URL]: page([makeBlogCategory()]) })

    const { hasBlogCategories } = await menu()

    expect(hasBlogCategories.value).toBe(false)
    expect(api.callsTo(CATEGORIES_URL)).toEqual([])
  })

  it('is empty when the topics fail to load', async () => {
    api.routes({ [CATEGORIES_URL]: failWith(502) })

    const { hasBlogCategories } = await menu()

    expect(hasBlogCategories.value).toBe(false)
  })
})
