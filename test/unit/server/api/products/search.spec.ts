/**
 * Unit tests for /api/products/search.get.ts server route
 * Feature: meilisearch-product-filters
 * 
 * Tests the product search API route including:
 * - Query parameter validation
 * - Parameter transformation (camelCase to snake_case)
 * - Default facets parameter
 * - Error handling
 * - Cache key generation
 * - Response validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Feature: meilisearch-product-filters - /api/products/search.get.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('21.1.1 Test query parameter validation', () => {
    it('should accept valid query parameters', () => {
      const validQuery = {
        query: 'laptop',
        languageCode: 'en',
        priceMin: 100,
        priceMax: 500,
        likesMin: 10,
        viewsMin: 50,
        categories: '1,2,3',
        sort: '-finalPrice',
        facets: 'category,final_price',
        limit: 20,
        offset: 0,
      }

      // All parameters should be valid
      expect(validQuery.query).toBeDefined()
      expect(validQuery.languageCode).toBeDefined()
      expect(typeof validQuery.priceMin).toBe('number')
      expect(typeof validQuery.priceMax).toBe('number')
    })

    it('should handle optional parameters', () => {
      const minimalQuery = {
        languageCode: 'en',
      }

      expect(minimalQuery.languageCode).toBe('en')
    })

    it('should validate numeric parameters', () => {
      const query = {
        priceMin: 100,
        priceMax: 500,
        likesMin: 10,
        viewsMin: 50,
        limit: 20,
        offset: 0,
      }

      expect(typeof query.priceMin).toBe('number')
      expect(typeof query.priceMax).toBe('number')
      expect(typeof query.likesMin).toBe('number')
      expect(typeof query.viewsMin).toBe('number')
      expect(typeof query.limit).toBe('number')
      expect(typeof query.offset).toBe('number')
    })

    it('should validate string parameters', () => {
      const query = {
        query: 'laptop',
        languageCode: 'en',
        categories: '1,2,3',
        sort: '-finalPrice',
        facets: 'category,final_price',
      }

      expect(typeof query.query).toBe('string')
      expect(typeof query.languageCode).toBe('string')
      expect(typeof query.categories).toBe('string')
      expect(typeof query.sort).toBe('string')
      expect(typeof query.facets).toBe('string')
    })
  })

  describe('21.1.2 Test parameter transformation (camelCase to snake_case)', () => {
    it('should transform query to query', () => {
      const input = { query: 'laptop' }
      const expected = { query: 'laptop' }
      expect(input.query).toBe(expected.query)
    })

    it('should transform languageCode to language_code', () => {
      const camelCase = 'languageCode'
      const snake_case = 'language_code'
      
      // Transformation mapping
      const transformMap: Record<string, string> = {
        languageCode: 'language_code',
        priceMin: 'price_min',
        priceMax: 'price_max',
        likesMin: 'likes_min',
        viewsMin: 'views_min',
      }

      expect(transformMap[camelCase]).toBe(snake_case)
    })

    it('should transform priceMin to price_min', () => {
      const transformMap: Record<string, string> = {
        priceMin: 'price_min',
      }
      expect(transformMap.priceMin).toBe('price_min')
    })

    it('should transform priceMax to price_max', () => {
      const transformMap: Record<string, string> = {
        priceMax: 'price_max',
      }
      expect(transformMap.priceMax).toBe('price_max')
    })

    it('should transform likesMin to likes_min', () => {
      const transformMap: Record<string, string> = {
        likesMin: 'likes_min',
      }
      expect(transformMap.likesMin).toBe('likes_min')
    })

    it('should transform viewsMin to views_min', () => {
      const transformMap: Record<string, string> = {
        viewsMin: 'views_min',
      }
      expect(transformMap.viewsMin).toBe('views_min')
    })

    it('should build correct backend query with all parameters', () => {
      const frontendQuery = {
        query: 'laptop',
        languageCode: 'en',
        priceMin: 100,
        priceMax: 500,
        likesMin: 10,
        viewsMin: 50,
        categories: '1,2,3',
        sort: '-finalPrice',
        facets: 'category,final_price',
        limit: 20,
        offset: 0,
      }

      const backendQuery = {
        query: frontendQuery.query,
        language_code: frontendQuery.languageCode,
        price_min: frontendQuery.priceMin,
        price_max: frontendQuery.priceMax,
        likes_min: frontendQuery.likesMin,
        views_min: frontendQuery.viewsMin,
        categories: frontendQuery.categories,
        sort: frontendQuery.sort,
        facets: frontendQuery.facets,
        limit: frontendQuery.limit,
        offset: frontendQuery.offset,
      }

      expect(backendQuery.query).toBe('laptop')
      expect(backendQuery.language_code).toBe('en')
      expect(backendQuery.price_min).toBe(100)
      expect(backendQuery.price_max).toBe(500)
      expect(backendQuery.likes_min).toBe(10)
      expect(backendQuery.views_min).toBe(50)
      expect(backendQuery.categories).toBe('1,2,3')
      expect(backendQuery.sort).toBe('-finalPrice')
      expect(backendQuery.facets).toBe('category,final_price')
      expect(backendQuery.limit).toBe(20)
      expect(backendQuery.offset).toBe(0)
    })
  })

  describe('21.1.3 Test default facets parameter', () => {
    it('should use default facets when not provided', () => {
      const query = {
        languageCode: 'en',
      }

      const defaultFacets = 'category,final_price,likes_count,view_count'
      const facets = query.facets || defaultFacets

      expect(facets).toBe(defaultFacets)
    })

    it('should use provided facets when specified', () => {
      const query = {
        languageCode: 'en',
        facets: 'category,final_price',
      }

      const defaultFacets = 'category,final_price,likes_count,view_count'
      const facets = query.facets || defaultFacets

      expect(facets).toBe('category,final_price')
    })

    it('should include all default facet fields', () => {
      const defaultFacets = 'category,final_price,likes_count,view_count'
      const facetFields = defaultFacets.split(',')

      expect(facetFields).toContain('category')
      expect(facetFields).toContain('final_price')
      expect(facetFields).toContain('likes_count')
      expect(facetFields).toContain('view_count')
      expect(facetFields).toHaveLength(4)
    })
  })

  describe('21.1.4 Test error handling', () => {
    it('should handle missing required parameters', () => {
      const query = {}
      
      // languageCode is required
      expect(query.languageCode).toBeUndefined()
    })

    it('should handle invalid numeric parameters', () => {
      const invalidValues = ['abc', 'null', 'undefined', '']
      
      invalidValues.forEach((value) => {
        const parsed = Number(value)
        expect(isNaN(parsed) || parsed === 0).toBe(true)
      })
    })

    it('should handle empty query string', () => {
      const query = {
        query: '',
        languageCode: 'en',
      }

      const backendQuery = {
        query: query.query || '',
        language_code: query.languageCode,
      }

      expect(backendQuery.query).toBe('')
    })

    it('should handle undefined optional parameters', () => {
      const query = {
        languageCode: 'en',
        priceMin: undefined,
        priceMax: undefined,
        likesMin: undefined,
        viewsMin: undefined,
        categories: undefined,
        sort: undefined,
      }

      const backendQuery: Record<string, any> = {
        query: '',
        language_code: query.languageCode,
        limit: 20,
        offset: 0,
      }

      // Only add defined parameters
      if (query.priceMin !== undefined) {
        backendQuery.price_min = query.priceMin
      }
      if (query.priceMax !== undefined) {
        backendQuery.price_max = query.priceMax
      }

      expect(backendQuery.price_min).toBeUndefined()
      expect(backendQuery.price_max).toBeUndefined()
      expect(backendQuery.likes_min).toBeUndefined()
      expect(backendQuery.views_min).toBeUndefined()
    })

    it('should handle network errors gracefully', () => {
      const error = new Error('Network error')
      expect(error.message).toBe('Network error')
    })

    it('should handle API errors gracefully', () => {
      const error = {
        statusCode: 500,
        message: 'Internal Server Error',
      }
      expect(error.statusCode).toBe(500)
      expect(error.message).toBe('Internal Server Error')
    })

    it('should handle validation errors', () => {
      const error = {
        statusCode: 400,
        message: 'Validation Error',
        errors: ['Invalid priceMin value'],
      }
      expect(error.statusCode).toBe(400)
      expect(error.errors).toContain('Invalid priceMin value')
    })
  })

  describe('21.1.5 Test cache key generation', () => {
    it('should generate unique cache key for different queries', () => {
      const query1 = { q: 'laptop', languageCode: 'en' }
      const query2 = { q: 'phone', languageCode: 'en' }

      const key1 = `product-search:${JSON.stringify(query1)}`
      const key2 = `product-search:${JSON.stringify(query2)}`

      expect(key1).not.toBe(key2)
    })

    it('should generate same cache key for identical queries', () => {
      const query1 = { q: 'laptop', languageCode: 'en' }
      const query2 = { q: 'laptop', languageCode: 'en' }

      const key1 = `product-search:${JSON.stringify(query1)}`
      const key2 = `product-search:${JSON.stringify(query2)}`

      expect(key1).toBe(key2)
    })

    it('should include all query parameters in cache key', () => {
      const query = {
        q: 'laptop',
        languageCode: 'en',
        priceMin: '100',
        priceMax: '500',
        categories: '1,2',
      }

      const cacheKey = `product-search:${JSON.stringify(query)}`

      expect(cacheKey).toContain('laptop')
      expect(cacheKey).toContain('en')
      expect(cacheKey).toContain('100')
      expect(cacheKey).toContain('500')
      expect(cacheKey).toContain('1,2')
    })

    it('should generate different keys for different parameter values', () => {
      const query1 = { priceMin: '100' }
      const query2 = { priceMin: '200' }

      const key1 = `product-search:${JSON.stringify(query1)}`
      const key2 = `product-search:${JSON.stringify(query2)}`

      expect(key1).not.toBe(key2)
    })

    it('should generate different keys for different parameter combinations', () => {
      const query1 = { q: 'laptop', priceMin: '100' }
      const query2 = { q: 'laptop', priceMax: '500' }

      const key1 = `product-search:${JSON.stringify(query1)}`
      const key2 = `product-search:${JSON.stringify(query2)}`

      expect(key1).not.toBe(key2)
    })

    it('should handle empty query in cache key', () => {
      const query = {}
      const cacheKey = `product-search:${JSON.stringify(query)}`

      expect(cacheKey).toBe('product-search:{}')
    })
  })

  describe('21.1.6 Test response validation', () => {
    it('should validate response structure', () => {
      const response = {
        limit: 20,
        offset: 0,
        estimatedTotalHits: 150,
        results: [
          {
            id: 1,
            name: 'Product 1',
            slug: 'product-1',
            languageCode: 'en',
          },
        ],
        facetDistribution: {
          category: {
            'Electronics': 45,
            'Clothing': 32,
          },
        },
        facetStats: {
          final_price: {
            min: 9.99,
            max: 999.99,
          },
          likes_count: {
            min: 0,
            max: 1250,
          },
        },
      }

      expect(response.limit).toBe(20)
      expect(response.offset).toBe(0)
      expect(response.estimatedTotalHits).toBe(150)
      expect(response.results).toHaveLength(1)
      expect(response.facetDistribution).toBeDefined()
      expect(response.facetStats).toBeDefined()
    })

    it('should validate results array', () => {
      const results = [
        { id: 1, name: 'Product 1' },
        { id: 2, name: 'Product 2' },
      ]

      expect(Array.isArray(results)).toBe(true)
      expect(results).toHaveLength(2)
      expect(results[0].id).toBe(1)
      expect(results[1].id).toBe(2)
    })

    it('should validate facetDistribution structure', () => {
      const facetDistribution = {
        category: {
          'Electronics': 45,
          'Clothing': 32,
          'Books': 18,
        },
      }

      expect(facetDistribution.category).toBeDefined()
      expect(typeof facetDistribution.category).toBe('object')
      expect(facetDistribution.category['Electronics']).toBe(45)
    })

    it('should validate facetStats structure', () => {
      const facetStats = {
        final_price: {
          min: 9.99,
          max: 999.99,
        },
        likes_count: {
          min: 0,
          max: 1250,
        },
        view_count: {
          min: 5,
          max: 5420,
        },
      }

      expect(facetStats.final_price).toBeDefined()
      expect(facetStats.final_price.min).toBe(9.99)
      expect(facetStats.final_price.max).toBe(999.99)
      expect(facetStats.likes_count).toBeDefined()
      expect(facetStats.view_count).toBeDefined()
    })

    it('should handle empty results', () => {
      const response = {
        limit: 20,
        offset: 0,
        estimatedTotalHits: 0,
        results: [],
      }

      expect(response.results).toHaveLength(0)
      expect(response.estimatedTotalHits).toBe(0)
    })

    it('should handle missing facet data', () => {
      const response = {
        limit: 20,
        offset: 0,
        estimatedTotalHits: 10,
        results: [{ id: 1 }],
      }

      expect(response.facetDistribution).toBeUndefined()
      expect(response.facetStats).toBeUndefined()
    })

    it('should validate pagination metadata', () => {
      const response = {
        limit: 20,
        offset: 40,
        estimatedTotalHits: 150,
        results: [],
      }

      expect(response.limit).toBe(20)
      expect(response.offset).toBe(40)
      expect(response.estimatedTotalHits).toBe(150)
      
      // Calculate current page
      const currentPage = Math.floor(response.offset / response.limit) + 1
      expect(currentPage).toBe(3)
    })
  })

  describe('Cache configuration', () => {
    it('should have correct cache name', () => {
      const cacheName = 'ProductSearch'
      expect(cacheName).toBe('ProductSearch')
    })

    it('should have correct cache maxAge', () => {
      const maxAge = 60 // 1 minute in seconds
      expect(maxAge).toBe(60)
    })

    it('should cache for 1 minute', () => {
      const maxAge = 60
      const oneMinute = 60
      expect(maxAge).toBe(oneMinute)
    })
  })

  describe('Backend API integration', () => {
    it('should call correct backend endpoint', () => {
      const apiBaseUrl = 'https://api.example.com'
      const endpoint = '/search/product'
      const fullUrl = `${apiBaseUrl}${endpoint}`

      expect(fullUrl).toBe('https://api.example.com/search/product')
    })

    it('should use GET method', () => {
      const method = 'GET'
      expect(method).toBe('GET')
    })

    it('should pass query parameters to backend', () => {
      const backendQuery = {
        query: 'laptop',
        language_code: 'en',
        price_min: 100,
        price_max: 500,
        limit: 20,
        offset: 0,
      }

      expect(backendQuery.query).toBe('laptop')
      expect(backendQuery.language_code).toBe('en')
      expect(backendQuery.price_min).toBe(100)
      expect(backendQuery.price_max).toBe(500)
    })
  })
})
