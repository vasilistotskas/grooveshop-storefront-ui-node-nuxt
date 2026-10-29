import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

const CATEGORIES_URL = '/api/blog/categories'
const POSTS_URL = '/api/blog/posts'

const category = (id: number) => ({ id, slug: `c${id}`, postCount: 1, translations: { el: { name: `Κατηγορία ${id}` } } })
const CATEGORIES = { count: 12, results: Array.from({ length: 12 }, (_, i) => category(i + 1)) }
const POSTS = { count: 0, next: null, previous: null, results: [] }

async function mountAll(setup: () => Promise<unknown>) {
  await mountSuspended(defineComponent({
    async setup() {
      await setup()
      return () => h('div')
    },
  }), { route: false })
}

/**
 * The blog's categories are one request however many bands read them: the
 * index's pills, the names under a band of posts and the rail. Each reader
 * takes what it needs of the one list.
 */
describe('useBlogCategories', () => {
  beforeEach(() => {
    clearNuxtData()
    useState<CursorState>('cursor-state').value = generateInitialCursorState()
    setTenant()
    setTenantFeatures({ blog: true })
    api.routes({ [CATEGORIES_URL]: CATEGORIES, [POSTS_URL]: POSTS })
  })

  it('is asked for once by the rail and the names of a band of posts together', async () => {
    let rail!: Awaited<ReturnType<typeof useBlogCategoryRail>>
    let name!: Awaited<ReturnType<typeof useBlogCategoryNames>>
    await mountAll(async () => {
      [rail, name] = await Promise.all([useBlogCategoryRail({ pageSize: 10 }), useBlogCategoryNames()])
    })

    expect(api.callsTo(CATEGORIES_URL)).toHaveLength(1)
    expect(rail.categories.value).toHaveLength(10)
    expect(name(12)).toBe('Κατηγορία 12')
  })

  it('starts the index\'s categories while its posts are still on their way', async () => {
    let answerPosts!: () => void
    api.routes({
      [CATEGORIES_URL]: CATEGORIES,
      [POSTS_URL]: () => new Promise((resolve) => {
        answerPosts = () => resolve(POSTS)
      }),
    })

    const loading = mountAll(() => useBlogListing({ paginationType: 'pageNumber', pageSize: 10 }))
    await vi.waitFor(() => expect(api.callsTo(CATEGORIES_URL)).toHaveLength(1))
    answerPosts()
    await loading
  })

  it('asks for nothing when the store has no blog', async () => {
    setTenantFeatures({ blog: false })

    await mountAll(() => useBlogCategoryRail({ pageSize: 10 }))

    expect(api.callsTo(CATEGORIES_URL)).toEqual([])
  })
})
