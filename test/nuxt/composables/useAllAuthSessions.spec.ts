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

mockNuxtImport('onAllAuthResponse', () => {
  return vi.fn(async () => {})
})

mockNuxtImport('onAllAuthResponseError', () => {
  return vi.fn(async () => {})
})

describe('useAllAuthSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSessions', () => {
    it('should fetch sessions with correct parameters', async () => {
      mockFetch.mockResolvedValue({ data: [] })

      const { getSessions } = useAllAuthSessions()
      await getSessions()

      expect(mockFetch).toHaveBeenCalledWith('/api/_allauth/app/v1/auth/sessions', {
        method: 'GET',
        headers: {},
        onResponse: expect.any(Function),
        onResponseError: expect.any(Function),
      })
    })

    it('should return sessions data', async () => {
      const mockData = { data: [{ id: 1, device: 'Chrome' }] }
      mockFetch.mockResolvedValue(mockData)

      const { getSessions } = useAllAuthSessions()
      const result = await getSessions()

      expect(result).toEqual(mockData)
    })

    it('should call onAllAuthResponse on successful response', async () => {
      const mockResponse = { data: [] }
      mockFetch.mockImplementation(async (url, options) => {
        await options.onResponse({ response: mockResponse })
        return mockResponse
      })

      const { getSessions } = useAllAuthSessions()
      await getSessions()

      expect(onAllAuthResponse).toHaveBeenCalledWith(mockResponse)
    })
  })

  describe('deleteSession', () => {
    it('should delete session with correct parameters', async () => {
      mockFetch.mockResolvedValue({ success: true })

      const { deleteSession } = useAllAuthSessions()
      const body = { sessions: [123] }
      await deleteSession(body)

      expect(mockFetch).toHaveBeenCalledWith('/api/_allauth/app/v1/auth/sessions', {
        method: 'DELETE',
        body,
        onResponse: expect.any(Function),
        onResponseError: expect.any(Function),
      })
    })

    it('should return delete result', async () => {
      const mockData = { success: true }
      mockFetch.mockResolvedValue(mockData)

      const { deleteSession } = useAllAuthSessions()
      const result = await deleteSession({ sessions: [456] })

      expect(result).toEqual(mockData)
    })

    it('should call onAllAuthResponse on successful deletion', async () => {
      const mockResponse = { success: true }
      mockFetch.mockImplementation(async (url, options) => {
        await options.onResponse({ response: mockResponse })
        return mockResponse
      })

      const { deleteSession } = useAllAuthSessions()
      await deleteSession({ sessions: [789] })

      expect(onAllAuthResponse).toHaveBeenCalledWith(mockResponse)
    })

    it('should call onAllAuthResponseError on error', async () => {
      const mockError = { error: 'Not found' }
      mockFetch.mockImplementation(async (url, options) => {
        await options.onResponseError({ response: mockError })
        throw mockError
      })

      const { deleteSession } = useAllAuthSessions()

      try {
        await deleteSession({ sessions: [999] })
      }
      catch (error) {
        expect(onAllAuthResponseError).toHaveBeenCalledWith(mockError)
      }
    })
  })
})
