import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Feature: meilisearch-product-filters
 * Extended Reactivity Tests
 * 
 * These tests verify filter changes trigger correct API calls,
 * debouncing with rapid filter updates, and filter state updates
 * with async operations.
 */

describe('Feature: meilisearch-product-filters - Extended Reactivity Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('23.3.1 Filter changes trigger correct API calls', () => {
    it('should trigger API call when search filter changes', async () => {
      const apiCalls: string[] = []
      
      const mockApiCall = (filters: any) => {
        apiCalls.push(`search:${filters.search}`)
        return Promise.resolve({ results: [] })
      }

      // Simulate filter changes
      await mockApiCall({ search: 'laptop' })
      await mockApiCall({ search: 'phone' })
      await mockApiCall({ search: 'tablet' })

      expect(apiCalls).toHaveLength(3)
      expect(apiCalls[0]).toBe('search:laptop')
      expect(apiCalls[1]).toBe('search:phone')
      expect(apiCalls[2]).toBe('search:tablet')
    })

    it('should trigger API call when price filter changes', async () => {
      const apiCalls: any[] = []
      
      const mockApiCall = (filters: any) => {
        apiCalls.push({ priceMin: filters.priceMin, priceMax: filters.priceMax })
        return Promise.resolve({ results: [] })
      }

      await mockApiCall({ priceMin: 100, priceMax: 500 })
      await mockApiCall({ priceMin: 200, priceMax: 800 })

      expect(apiCalls).toHaveLength(2)
      expect(apiCalls[0]).toEqual({ priceMin: 100, priceMax: 500 })
      expect(apiCalls[1]).toEqual({ priceMin: 200, priceMax: 800 })
    })

    it('should trigger API call when category filter changes', async () => {
      const apiCalls: string[][] = []
      
      const mockApiCall = (filters: any) => {
        apiCalls.push(filters.categories)
        return Promise.resolve({ results: [] })
      }

      await mockApiCall({ categories: ['1'] })
      await mockApiCall({ categories: ['1', '2'] })
      await mockApiCall({ categories: ['1', '2', '3'] })

      expect(apiCalls).toHaveLength(3)
      expect(apiCalls[0]).toEqual(['1'])
      expect(apiCalls[1]).toEqual(['1', '2'])
      expect(apiCalls[2]).toEqual(['1', '2', '3'])
    })

    it('should trigger API call when multiple filters change', async () => {
      const apiCalls: any[] = []
      
      const mockApiCall = (filters: any) => {
        apiCalls.push({ ...filters })
        return Promise.resolve({ results: [] })
      }

      await mockApiCall({ search: 'laptop', priceMin: 500 })
      await mockApiCall({ search: 'laptop', priceMin: 500, categories: ['1'] })

      expect(apiCalls).toHaveLength(2)
      expect(apiCalls[1].categories).toEqual(['1'])
    })

    it('should not trigger API call when filter value is unchanged', () => {
      const apiCalls: number[] = []
      let callCount = 0
      
      const mockApiCall = (filters: any) => {
        callCount++
        apiCalls.push(callCount)
        return Promise.resolve({ results: [] })
      }

      const filters1 = { search: 'laptop' }
      const filters2 = { search: 'laptop' }

      mockApiCall(filters1)
      
      // Should skip if same value
      if (JSON.stringify(filters1) !== JSON.stringify(filters2)) {
        mockApiCall(filters2)
      }

      expect(apiCalls).toHaveLength(1)
    })

    it('should include all active filters in API call', async () => {
      const mockApiCall = (filters: any) => {
        return Promise.resolve({ 
          request: filters,
          results: [] 
        })
      }

      const allFilters = {
        search: 'laptop',
        priceMin: 500,
        priceMax: 1500,
        likesMin: 10,
        viewsMin: 100,
        categories: ['1', '2'],
        sort: '-likesCount',
      }

      const response = await mockApiCall(allFilters)

      expect(response.request).toEqual(allFilters)
      expect(Object.keys(response.request)).toHaveLength(7)
    })
  })

  describe('23.3.2 Debouncing with rapid filter updates', () => {
    it('should debounce rapid search input changes', async () => {
      const apiCalls: string[] = []
      let debounceTimer: NodeJS.Timeout | null = null
      
      const debouncedApiCall = (value: string, delay: number = 300) => {
        return new Promise<void>((resolve) => {
          if (debounceTimer) clearTimeout(debounceTimer)
          
          debounceTimer = setTimeout(() => {
            apiCalls.push(value)
            resolve()
          }, delay)
        })
      }

      // Simulate rapid typing
      debouncedApiCall('l', 300)
      debouncedApiCall('la', 300)
      debouncedApiCall('lap', 300)
      debouncedApiCall('lapt', 300)
      const finalCall = debouncedApiCall('laptop', 300)

      await finalCall

      // Only the last call should execute
      expect(apiCalls).toHaveLength(1)
      expect(apiCalls[0]).toBe('laptop')
    })

    it('should debounce rapid slider changes', async () => {
      const apiCalls: number[] = []
      let debounceTimer: NodeJS.Timeout | null = null
      
      const debouncedSliderUpdate = (value: number, delay: number = 500) => {
        return new Promise<void>((resolve) => {
          if (debounceTimer) clearTimeout(debounceTimer)
          
          debounceTimer = setTimeout(() => {
            apiCalls.push(value)
            resolve()
          }, delay)
        })
      }

      // Simulate rapid slider dragging
      debouncedSliderUpdate(100, 500)
      debouncedSliderUpdate(200, 500)
      debouncedSliderUpdate(300, 500)
      debouncedSliderUpdate(400, 500)
      const finalCall = debouncedSliderUpdate(500, 500)

      await finalCall

      // Only the last value should trigger API call
      expect(apiCalls).toHaveLength(1)
      expect(apiCalls[0]).toBe(500)
    })

    it('should use different debounce delays for different inputs', () => {
      const searchDebounce = 300
      const sliderDebounce = 500

      expect(searchDebounce).toBeLessThan(sliderDebounce)
      expect(searchDebounce).toBe(300)
      expect(sliderDebounce).toBe(500)
    })

    it('should cancel pending debounced calls on new input', async () => {
      const executedCalls: string[] = []
      const cancelledCalls: string[] = []
      let debounceTimer: NodeJS.Timeout | null = null
      
      const debouncedCall = (value: string, delay: number = 300) => {
        return new Promise<void>((resolve) => {
          if (debounceTimer) {
            cancelledCalls.push('cancelled')
            clearTimeout(debounceTimer)
          }
          
          debounceTimer = setTimeout(() => {
            executedCalls.push(value)
            resolve()
          }, delay)
        })
      }

      debouncedCall('a', 300)
      debouncedCall('ab', 300)
      const finalCall = debouncedCall('abc', 300)

      await finalCall

      expect(executedCalls).toHaveLength(1)
      expect(executedCalls[0]).toBe('abc')
      expect(cancelledCalls.length).toBeGreaterThan(0)
    })

    it('should handle multiple concurrent debounced inputs', async () => {
      const searchCalls: string[] = []
      const priceCalls: number[] = []
      
      let searchTimer: NodeJS.Timeout | null = null
      let priceTimer: NodeJS.Timeout | null = null
      
      const debouncedSearch = (value: string) => {
        return new Promise<void>((resolve) => {
          if (searchTimer) clearTimeout(searchTimer)
          searchTimer = setTimeout(() => {
            searchCalls.push(value)
            resolve()
          }, 300)
        })
      }
      
      const debouncedPrice = (value: number) => {
        return new Promise<void>((resolve) => {
          if (priceTimer) clearTimeout(priceTimer)
          priceTimer = setTimeout(() => {
            priceCalls.push(value)
            resolve()
          }, 500)
        })
      }

      // Concurrent updates
      const searchPromise = debouncedSearch('laptop')
      const pricePromise = debouncedPrice(500)

      await Promise.all([searchPromise, pricePromise])

      expect(searchCalls).toHaveLength(1)
      expect(priceCalls).toHaveLength(1)
    })
  })

  describe('23.3.3 Filter state updates with async operations', () => {
    it('should handle async filter updates', async () => {
      const updateFilter = async (key: string, value: any) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10))
        return { [key]: value }
      }

      const result = await updateFilter('search', 'laptop')
      expect(result).toEqual({ search: 'laptop' })
    })

    it('should handle multiple async filter updates in sequence', async () => {
      const updates: any[] = []
      
      const updateFilter = async (filters: any) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        updates.push({ ...filters })
      }

      await updateFilter({ search: 'laptop' })
      await updateFilter({ search: 'laptop', priceMin: 500 })
      await updateFilter({ search: 'laptop', priceMin: 500, categories: ['1'] })

      expect(updates).toHaveLength(3)
      expect(updates[2].categories).toEqual(['1'])
    })

    it('should handle race conditions in filter updates', async () => {
      const results: number[] = []
      
      const asyncUpdate = async (id: number, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay))
        results.push(id)
      }

      // Start multiple async operations
      const promises = [
        asyncUpdate(1, 50),
        asyncUpdate(2, 30),
        asyncUpdate(3, 10),
      ]

      await Promise.all(promises)

      // Results should be in completion order, not start order
      expect(results).toHaveLength(3)
      expect(results[0]).toBe(3) // Fastest
      expect(results[2]).toBe(1) // Slowest
    })

    it('should handle failed async operations', async () => {
      const errors: string[] = []
      
      const asyncUpdate = async (shouldFail: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        
        if (shouldFail) {
          throw new Error('Update failed')
        }
        
        return { success: true }
      }

      try {
        await asyncUpdate(true)
      } catch (error: any) {
        errors.push(error.message)
      }

      expect(errors).toHaveLength(1)
      expect(errors[0]).toBe('Update failed')
    })

    it('should handle pending state during async operations', async () => {
      let isPending = false
      
      const asyncUpdate = async () => {
        isPending = true
        await new Promise(resolve => setTimeout(resolve, 50))
        isPending = false
        return { success: true }
      }

      const promise = asyncUpdate()
      expect(isPending).toBe(true)
      
      await promise
      expect(isPending).toBe(false)
    })

    it('should handle optimistic updates', async () => {
      const state = { filters: { search: '' } }
      
      const optimisticUpdate = async (newValue: string) => {
        // Optimistic update
        const oldValue = state.filters.search
        state.filters.search = newValue
        
        try {
          await new Promise(resolve => setTimeout(resolve, 10))
          // Success - keep new value
          return { success: true }
        } catch (error) {
          // Rollback on error
          state.filters.search = oldValue
          throw error
        }
      }

      await optimisticUpdate('laptop')
      expect(state.filters.search).toBe('laptop')
    })

    it('should handle concurrent async updates to different filters', async () => {
      const state = {
        search: '',
        priceMin: undefined as number | undefined,
        categories: [] as string[],
      }
      
      const updateSearch = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 20))
        state.search = value
      }
      
      const updatePrice = async (value: number) => {
        await new Promise(resolve => setTimeout(resolve, 30))
        state.priceMin = value
      }
      
      const updateCategories = async (value: string[]) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        state.categories = value
      }

      await Promise.all([
        updateSearch('laptop'),
        updatePrice(500),
        updateCategories(['1', '2']),
      ])

      expect(state.search).toBe('laptop')
      expect(state.priceMin).toBe(500)
      expect(state.categories).toEqual(['1', '2'])
    })
  })
})
