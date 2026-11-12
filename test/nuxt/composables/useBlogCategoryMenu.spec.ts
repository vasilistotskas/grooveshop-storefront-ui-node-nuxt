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
const KEY = 'blog-category-menu-el'

const page = (results: ReturnType<typeof makeBlogCategory>[]) => ({ count: results.length, next: null, previous: null, results })

/** The menu once its request has answered (or been refused). */
async function menu() {
  let result!: ReturnType<typeof useBlogCategoryMenu>
  await mountSuspended(defineComponent({
    setup() {
      result = useBlogCategoryMenu()
      return () => h('div')
    },
  }), { route: false })
  await vi.waitFor(() => expect(useNuxtApp()._asyncData[KEY]?.status.value).not.toBe('pending'))
  return result
}

/**
 * The blog's topics as the header's Blog dropdown and the phone menus
 * list them: the top-level topics, capped, each with its page and post
 * count. The menus sit on every page, so this is cut to that shape
 * BEFORE it reaches the payload.
 */
describe('useBlogCategoryMenu', () => {
  beforeEach(() => {
    clearNuxtData([KEY])
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

  it('keeps only the menu in the payload, not the category list', async () => {
    api.routes({
      [CATEGORIES_URL]: page([makeBlogCategory({ id: 1, translations: { el: { name: 'Κινητό', description: 'Οδηγοί για το κινητό σου' } } })]),
    })

    const { blogCategories } = await menu()

    expect(useNuxtApp().payload.data[KEY]).toEqual(blogCategories.value)
    expect(JSON.stringify(useNuxtApp().payload.data[KEY])).not.toContain('Οδηγοί')
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
