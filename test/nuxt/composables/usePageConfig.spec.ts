import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockUseFetchFn } = vi.hoisted(() => ({
  mockUseFetchFn: vi.fn(),
}))

mockNuxtImport('useFetch', () => mockUseFetchFn)

const HOME_FALLBACK = [
  'blog_categories',
  'hero_carousel',
  'recently_viewed',
  'blog_posts_list',
]

describe('usePageConfig', () => {
  beforeEach(() => {
    mockUseFetchFn.mockReset()
  })

  it('should return sections filtered by visibility and sorted', async () => {
    const sections = [
      { id: 3, uuid: 'c', componentType: 'spacer', title: '', isVisible: true, props: {}, sortOrder: 2 },
      { id: 1, uuid: 'a', componentType: 'hero_carousel', title: '', isVisible: true, props: {}, sortOrder: 0 },
      { id: 2, uuid: 'b', componentType: 'products_grid', title: '', isVisible: false, props: {}, sortOrder: 1 },
    ]

    mockUseFetchFn.mockReturnValue({
      data: ref({
        layout: {
          id: 1,
          uuid: 'layout-uuid',
          pageType: 'home',
          title: 'Homepage',
          isPublished: true,
          metadata: {},
          sections,
        },
      }),
      status: ref('success'),
      error: ref(null),
    })

    const { layout, sections: result } = await usePageConfig('home')

    expect(layout.value?.title).toBe('Homepage')
    expect(result.value).toHaveLength(2)
    expect(result.value![0]!.componentType).toBe('hero_carousel')
    expect(result.value![1]!.componentType).toBe('spacer')
  })

  it('should return the home fallback when the route reports no published layout', async () => {
    // The route answers `{ layout: null }` — data, not an error — when the
    // tenant has no published layout for the page type. That is the
    // documented normal state, so `error` stays null and callers that
    // 404 on an absent layout read `layout`, not `error`.
    mockUseFetchFn.mockReturnValue({
      data: ref({ layout: null }),
      status: ref('success'),
      error: ref(null),
    })

    const { layout, sections, error } = await usePageConfig('home')

    expect(layout.value).toBeNull()
    expect(error.value).toBeNull()
    expect(sections.value.map(s => s.componentType)).toEqual(HOME_FALLBACK)
  })

  it('should return the home fallback when the backend is unavailable', async () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(Object.assign(new Error('Service Unavailable'), { statusCode: 503 })),
    })

    const { layout, sections, error } = await usePageConfig('home')

    expect(layout.value).toBeNull()
    expect(error.value?.statusCode).toBe(503)
    expect(sections.value.map(s => s.componentType)).toEqual(HOME_FALLBACK)
  })

  it('should return empty array fallback for unknown page type', async () => {
    mockUseFetchFn.mockReturnValue({
      data: ref({ layout: null }),
      status: ref('success'),
      error: ref(null),
    })

    const { sections } = await usePageConfig('unknown-page')

    expect(sections.value).toEqual([])
  })

  it('should call useFetch with correct URL and key', async () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('pending'),
      error: ref(null),
    })

    await usePageConfig('products')

    expect(mockUseFetchFn).toHaveBeenCalledWith(
      '/api/page-config/products',
      expect.objectContaining({ key: 'page-config-products' }),
      expect.anything(),
    )
  })
})
