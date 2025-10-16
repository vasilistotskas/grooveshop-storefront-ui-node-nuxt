import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useRequestHeaders', () => {
  return vi.fn(() => ({}))
})

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch notifications with default seen parameter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ data: [] })
    vi.stubGlobal('$fetch', mockFetch)

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
    const mockFetch = vi.fn().mockResolvedValue({ data: [] })
    vi.stubGlobal('$fetch', mockFetch)

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
    const mockFetch = vi.fn().mockResolvedValue({ data: [] })
    vi.stubGlobal('$fetch', mockFetch)

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
    const mockFetch = vi.fn().mockResolvedValue(mockData)
    vi.stubGlobal('$fetch', mockFetch)

    const { getNotifications } = useNotification()
    const result = await getNotifications([1])

    expect(result).toEqual(mockData)
  })
})
