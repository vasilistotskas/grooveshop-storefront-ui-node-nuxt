import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildFullUrl, getMimeType, createCachedFetcher } from '../../../../server/utils/api'

describe('Server Utils - API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildFullUrl', () => {
    it('should build URL with base only', () => {
      const url = buildFullUrl('https://api.example.com/products')
      expect(url).toBe('https://api.example.com/products')
    })

    it('should append single query parameter', () => {
      const url = buildFullUrl('https://api.example.com/products', { page: 1 })
      expect(url).toBe('https://api.example.com/products?page=1')
    })

    it('should append multiple query parameters', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        page: 1,
        limit: 10,
        sort: 'name',
      })
      expect(url).toContain('page=1')
      expect(url).toContain('limit=10')
      expect(url).toContain('sort=name')
    })

    it('should filter out null values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        page: 1,
        filter: null,
      })
      expect(url).toBe('https://api.example.com/products?page=1')
      expect(url).not.toContain('filter')
    })

    it('should filter out undefined values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        page: 1,
        filter: undefined,
      })
      expect(url).toBe('https://api.example.com/products?page=1')
      expect(url).not.toContain('filter')
    })

    it('should filter out empty string values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        page: 1,
        filter: '',
      })
      expect(url).toBe('https://api.example.com/products?page=1')
      expect(url).not.toContain('filter')
    })

    it('should filter out "null" string values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        page: 1,
        filter: 'null',
      })
      expect(url).toBe('https://api.example.com/products?page=1')
      expect(url).not.toContain('filter')
    })

    it('should filter out "undefined" string values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        page: 1,
        filter: 'undefined',
      })
      expect(url).toBe('https://api.example.com/products?page=1')
      expect(url).not.toContain('filter')
    })

    it('should handle boolean values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        active: true,
        featured: false,
      })
      expect(url).toContain('active=true')
      expect(url).toContain('featured=false')
    })

    it('should handle number values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        page: 1,
        limit: 10,
        price: 0,
      })
      expect(url).toContain('page=1')
      expect(url).toContain('limit=10')
      expect(url).toContain('price=0')
    })

    it('should handle special characters in query values', () => {
      const url = buildFullUrl('https://api.example.com/products', {
        search: 'test & demo',
      })
      expect(url).toContain('search=test+%26+demo')
    })

    it('should preserve existing query parameters in base URL', () => {
      const url = buildFullUrl('https://api.example.com/products?existing=value', {
        page: 1,
      })
      expect(url).toContain('existing=value')
      expect(url).toContain('page=1')
    })
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
      const result = await fetcher('https://api.example.com/data')

      expect(result).toEqual([{ id: 1 }, { id: 2 }])
      expect($fetch).toHaveBeenCalledWith('https://api.example.com/data', {
        method: 'GET',
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
      const result = await fetcher('https://api.example.com/data')

      expect(result).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
      ])
      expect($fetch).toHaveBeenCalledTimes(2)
    })

    it('should handle empty results', async () => {
      const mockData = {
        results: [],
        links: { next: null },
      }

      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockData))

      const fetcher = createCachedFetcher<any>('test', 60)
      const result = await fetcher('https://api.example.com/data')

      expect(result).toEqual([])
    })

    it('should handle missing results field', async () => {
      const mockData = {
        links: { next: null },
      }

      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(mockData))

      const fetcher = createCachedFetcher<any>('test', 60)
      const result = await fetcher('https://api.example.com/data')

      expect(result).toEqual([])
    })
  })
})
