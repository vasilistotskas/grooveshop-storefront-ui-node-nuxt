import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

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
      const mockFetch = vi.fn().mockResolvedValue({ data: [] })
      vi.stubGlobal('$fetch', mockFetch)

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
      const mockFetch = vi.fn().mockResolvedValue(mockData)
      vi.stubGlobal('$fetch', mockFetch)

      const { getSessions } = useAllAuthSessions()
      const result = await getSessions()

      expect(result).toEqual(mockData)
    })

    it('should call onAllAuthResponse on successful response', async () => {
      const mockResponse = { data: [] }
      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        await options.onResponse({ response: mockResponse })
        return mockResponse
      })
      vi.stubGlobal('$fetch', mockFetch)

      const { getSessions } = useAllAuthSessions()
      await getSessions()

      expect(onAllAuthResponse).toHaveBeenCalledWith(mockResponse)
    })
  })

  describe('deleteSession', () => {
    it('should delete session with correct parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ success: true })
      vi.stubGlobal('$fetch', mockFetch)

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
      const mockFetch = vi.fn().mockResolvedValue(mockData)
      vi.stubGlobal('$fetch', mockFetch)

      const { deleteSession } = useAllAuthSessions()
      const result = await deleteSession({ sessions: [456] })

      expect(result).toEqual(mockData)
    })

    it('should call onAllAuthResponse on successful deletion', async () => {
      const mockResponse = { success: true }
      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        await options.onResponse({ response: mockResponse })
        return mockResponse
      })
      vi.stubGlobal('$fetch', mockFetch)

      const { deleteSession } = useAllAuthSessions()
      await deleteSession({ sessions: [789] })

      expect(onAllAuthResponse).toHaveBeenCalledWith(mockResponse)
    })

    it('should call onAllAuthResponseError on error', async () => {
      const mockError = { error: 'Not found' }
      const mockFetch = vi.fn().mockImplementation(async (url, options) => {
        await options.onResponseError({ response: mockError })
        throw mockError
      })
      vi.stubGlobal('$fetch', mockFetch)

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
