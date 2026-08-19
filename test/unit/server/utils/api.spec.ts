import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMimeType, createCachedFetcher } from '../../../../server/utils/api'

// Mock defineCachedFunction for unit tests
vi.stubGlobal('defineCachedFunction', (fn: Function, options: any) => fn)

describe('Server Utils - API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMimeType', () => {
    it('should return correct MIME type for jpg', () => {
      expect(getMimeType('image.jpg')).toBe('image/jpeg')
    })

    it('should return correct MIME type for jpeg', () => {
      expect(getMimeType('image.jpeg')).toBe('image/jpeg')
    })

    it('should return correct MIME type for png', () => {
      expect(getMimeType('image.png')).toBe('image/png')
    })

    it('should return correct MIME type for gif', () => {
      expect(getMimeType('image.gif')).toBe('image/gif')
    })

    it('should return default MIME type for unknown extension', () => {
      expect(getMimeType('file.unknown')).toBe('application/octet-stream')
    })

    it('should handle uppercase extensions', () => {
      expect(getMimeType('image.JPG')).toBe('image/jpeg')
      expect(getMimeType('image.PNG')).toBe('image/png')
    })

    it('should handle mixed case extensions', () => {
      expect(getMimeType('image.JpG')).toBe('image/jpeg')
      expect(getMimeType('image.PnG')).toBe('image/png')
    })

    it('should handle files with multiple dots', () => {
      expect(getMimeType('my.image.file.jpg')).toBe('image/jpeg')
    })

    it('should handle files without extension', () => {
      expect(getMimeType('image')).toBe('application/octet-stream')
    })

    it('should handle paths with directories', () => {
      expect(getMimeType('/path/to/image.jpg')).toBe('image/jpeg')
    })
  })

  describe('createCachedFetcher', () => {
    it('should create a cached fetcher function', () => {
      const fetcher = createCachedFetcher<any>('test', 60)
      expect(typeof fetcher).toBe('function')
    })

    it('should fetch single page of data', async () => {
      const mockData = {
        results: [{ id: 1 }, { id: 2 }],
        links: { next: null },
      }

      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockData))

      const fetcher = createCachedFetcher<any>('test', 60)
      const result = await fetcher('webside.gr', 'https://api.example.com/data')

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
      // The tenantKey is forwarded as X-Forwarded-Host so Django resolves
      // the caller's schema (otherwise sitemap/RSS hit the public schema).
      expect($fetch).toHaveBeenCalledWith('https://api.example.com/data', {
        method: 'GET',
        headers: { 'X-Forwarded-Host': 'webside.gr' },
      })
    })

    it('should fetch multiple pages of data', async () => {
      const page1 = {
        results: [{ id: 1 }, { id: 2 }],
        links: { next: 'https://api.example.com/data?page=2' },
      }
      const page2 = {
        results: [{ id: 3 }, { id: 4 }],
        links: { next: null },
      }

      // Mock $fetch to return different data based on URL
      vi.stubGlobal('$fetch', vi.fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2))

      const fetcher = createCachedFetcher<any>('test', 60)
      const result = await fetcher('webside.gr', 'https://api.example.com/data')

      expect(result).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ])
      expect($fetch).toHaveBeenCalledTimes(2)
    })

    it('re-anchors tenant-host next links onto the internal base origin', async () => {
      // Django builds `next` from X-Forwarded-Host — under tenant host
      // inversion that's the STOREFRONT domain, which doesn't serve the
      // API (Nuxt 404s /api/v1/** in prod; on staging the hop dies on
      // ingress basic-auth). Only path+query may be followed, on the
      // origin the FIRST page was fetched from.
      const page1 = {
        results: [{ id: 1 }],
        links: { next: 'https://tenant-a.example/api/v1/blog/post?languageCode=el&page=2' },
      }
      const page2 = { results: [{ id: 2 }], links: { next: null } }
      vi.stubGlobal('$fetch', vi.fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2))

      const fetcher = createCachedFetcher<any>('test-rebase', 60)
      const result = await fetcher(
        'tenant-a.example',
        'http://backend-service:80/api/v1/blog/post?languageCode=el',
      )

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
      // Note: URL() elides the default port (:80 for http) when
      // normalizing the origin — functionally identical.
      expect($fetch).toHaveBeenNthCalledWith(
        2,
        'http://backend-service/api/v1/blog/post?languageCode=el&page=2',
        expect.anything(),
      )
    })

    it('should handle empty results', async () => {
      const mockData = {
        results: [],
        links: { next: null },
      }

      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockData))

      const fetcher = createCachedFetcher<any>('test', 60)
      const result = await fetcher('webside.gr', 'https://api.example.com/data')

      expect(result).toEqual([])
    })

    it('should handle missing results field', async () => {
      const mockData = {
        links: { next: null },
      }

      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockData))

      const fetcher = createCachedFetcher<any>('test', 60)
      const result = await fetcher('webside.gr', 'https://api.example.com/data')

      expect(result).toEqual([])
    })

    it('should derive cache key from tenantKey + url', () => {
      // The function passed to defineCachedFunction receives (tenantKey, url)
      // and the cache key generator must combine them — otherwise tenant A
      // and tenant B would collide on the same URL.
      let capturedOptions: any = null
      vi.stubGlobal('defineCachedFunction', (fn: Function, options: any) => {
        capturedOptions = options
        return fn
      })

      createCachedFetcher<any>('test', 60)

      expect(capturedOptions).not.toBeNull()
      expect(capturedOptions.getKey).toBeDefined()
      const key = capturedOptions.getKey('tenant-a.com', '/product')
      // Tenant host is part of the key so two tenants fetching the
      // same URL do NOT share a cache slot.
      expect(key).toContain('tenant-a.com')
      expect(key).toContain('/product')

      const otherKey = capturedOptions.getKey('tenant-b.com', '/product')
      expect(otherKey).not.toBe(key)
    })
  })
})
