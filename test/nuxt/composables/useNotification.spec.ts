import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Since Nuxt 4.5 `$fetch` is a real auto-import in user code, so
// `vi.stubGlobal('$fetch', ...)` no longer intercepts it — it must be
// mocked via mockNuxtImport like any other auto-import.
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }))

mockNuxtImport('$fetch', () => mockFetch)

mockNuxtImport('useRequestHeaders', () => {
  return vi.fn(() => ({}))
})

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch notifications with default seen parameter', async () => {
    mockFetch.mockResolvedValue({ data: [] })

    const { getNotifications } = useNotification()
    const ids = [1, 2, 3]

    await getNotifications(ids)

    expect(mockFetch).toHaveBeenCalledWith('/api/notification/ids', {
      method: 'POST',
      headers: {},
      body: { ids },
      query: { seen: false },
    })
  })

  it('should fetch notifications with seen parameter true', async () => {
    mockFetch.mockResolvedValue({ data: [] })

    const { getNotifications } = useNotification()
    const ids = [4, 5, 6]

    await getNotifications(ids, true)

    expect(mockFetch).toHaveBeenCalledWith('/api/notification/ids', {
      method: 'POST',
      headers: {},
      body: { ids },
      query: { seen: true },
    })
  })

  it('should handle empty ids array', async () => {
    mockFetch.mockResolvedValue({ data: [] })

    const { getNotifications } = useNotification()

    await getNotifications([])

    expect(mockFetch).toHaveBeenCalledWith('/api/notification/ids', {
      method: 'POST',
      headers: {},
      body: { ids: [] },
      query: { seen: false },
    })
  })

  it('should return notifications data', async () => {
    const mockData = { data: [{ id: 1, message: 'Test' }] }
    mockFetch.mockResolvedValue(mockData)

    const { getNotifications } = useNotification()
    const result = await getNotifications([1])

    expect(result).toEqual(mockData)
  })
})
