import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockUseFetchFn } = vi.hoisted(() => ({
  mockUseFetchFn: vi.fn(),
}))

mockNuxtImport('useFetch', () => mockUseFetchFn)

describe('usePageConfig', () => {
  beforeEach(() => {
    mockUseFetchFn.mockReset()
  })

  it('should return sections filtered by visibility and sorted', () => {
    const sections = [
      { id: 3, uuid: 'c', componentType: 'spacer', title: '', isVisible: true, props: {}, sortOrder: 2 },
      { id: 1, uuid: 'a', componentType: 'hero_carousel', title: '', isVisible: true, props: {}, sortOrder: 0 },
      { id: 2, uuid: 'b', componentType: 'products_grid', title: '', isVisible: false, props: {}, sortOrder: 1 },
    ]

    mockUseFetchFn.mockReturnValue({
      data: ref({
        id: 1,
        uuid: 'layout-uuid',
        pageType: 'home',
        title: 'Homepage',
        isPublished: true,
        metadata: {},
        sections,
      }),
      status: ref('success'),
      error: ref(null),
    })

    const { sections: result } = usePageConfig('home')

    expect(result.value).toHaveLength(2)
    expect(result.value![0]!.componentType).toBe('hero_carousel')
    expect(result.value![1]!.componentType).toBe('spacer')
  })

  it('should return fallback sections for home when data is null', () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(new Error('Not found')),
    })

    const { sections } = usePageConfig('home')

    expect(sections.value.length).toBeGreaterThan(0)
    expect(sections.value![0]!.componentType).toBe('hero_carousel')
  })

  it('should return empty array fallback for unknown page type', () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(new Error('Not found')),
    })

    const { sections } = usePageConfig('unknown-page')

    expect(sections.value).toEqual([])
  })

  it('should call useFetch with correct URL and key', () => {
    mockUseFetchFn.mockReturnValue({
      data: ref(null),
      status: ref('pending'),
      error: ref(null),
    })

    usePageConfig('products')

    expect(mockUseFetchFn).toHaveBeenCalledWith(
      '/api/page-config/products',
      expect.objectContaining({ key: 'page-config-products' }),
      expect.anything(),
    )
  })
})
