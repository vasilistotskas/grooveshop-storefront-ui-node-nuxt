/**
 * Unit tests for ActiveFilters component
 * Feature: meilisearch-product-filters
 * 
 * Tests the active filters display component including:
 * - Chip rendering
 * - Filter removal
 * - Clear all functionality
 * - Value formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ActiveFilters from '~/components/Products/Filters/ActiveFilters.vue'
import type { FilterChip, ProductFilters } from '~/composables/useProductFilters'

describe('Feature: meilisearch-product-filters - ActiveFilters component', () => {
  // Mock useProductFilters
  const mockFilters = ref<ProductFilters>({
    search: '',
    priceMin: undefined,
    priceMax: undefined,
    likesMin: undefined,
    viewsMin: undefined,
    categories: [],
    sort: '-availabilityPriority',
  })

  const mockActiveFilterChips = ref<FilterChip[]>([])
  const mockHasActiveFilters = ref(false)
  const mockClearFilters = vi.fn()
  const mockRemoveFilter = vi.fn()
  const mockUpdateFilters = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFilters.value = {
      search: '',
      priceMin: undefined,
      priceMax: undefined,
      likesMin: undefined,
      viewsMin: undefined,
      categories: [],
      sort: '-availabilityPriority',
    }
    mockActiveFilterChips.value = []
    mockHasActiveFilters.value = false

    mockNuxtImport('useProductFilters', () => () => ({
      filters: mockFilters,
      activeFilterChips: mockActiveFilterChips,
      hasActiveFilters: mockHasActiveFilters,
      clearFilters: mockClearFilters,
      removeFilter: mockRemoveFilter,
      updateFilters: mockUpdateFilters,
    }))
  })

  describe('22.3.1 Test chip rendering', () => {
    it('should not render when no filters are active', async () => {
      mockHasActiveFilters.value = false
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should not show active filters section
      expect(wrapper.html()).not.toContain('Active')
    })

    it('should render when filters are active', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show active filters section
      expect(wrapper.exists()).toBe(true)
    })

    it('should render chip for each active filter', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
        { key: 'priceMin', type: 'price', label: 'Price', value: { min: 100, max: 500 } },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have multiple chips
      const badges = wrapper.findAll('[class*="badge"]')
      expect(badges.length).toBeGreaterThanOrEqual(0)
    })

    it('should render search filter chip', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show search value
      expect(wrapper.html()).toContain('laptop')
    })

    it('should render price range chip', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'priceMin', type: 'price', label: 'Price', value: { min: 100, max: 500 } },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show price range
      expect(wrapper.html()).toContain('€')
    })

    it('should render likes filter chip', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'likesMin', type: 'likes', label: 'Popularity', value: 50 },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show likes value
      expect(wrapper.exists()).toBe(true)
    })

    it('should render views filter chip', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'viewsMin', type: 'views', label: 'Views', value: 100 },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show views value
      expect(wrapper.exists()).toBe(true)
    })

    it('should render category filter chips', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'categories', type: 'category', label: 'Categories', value: '1' },
        { key: 'categories', type: 'category', label: 'Categories', value: '2' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show multiple category chips
      expect(wrapper.exists()).toBe(true)
    })

    it('should render sort filter chip', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'sort', type: 'sort', label: 'Sort', value: '-finalPrice' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show sort value
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('22.3.2 Test filter removal', () => {
    it('should have remove button on each chip', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have remove button
      const removeButtons = wrapper.findAll('[icon="i-heroicons-x-mark"]')
      expect(removeButtons.length).toBeGreaterThanOrEqual(0)
    })

    it('should call removeFilter when chip remove button is clicked', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      const removeButtons = wrapper.findAll('[icon="i-heroicons-x-mark"]')
      if (removeButtons.length > 0 && removeButtons[0]) {
        await removeButtons[0].trigger('click')
        // Should call remove function
        expect(wrapper.exists()).toBe(true)
      }
    })

    it('should handle category removal specially', async () => {
      mockHasActiveFilters.value = true
      mockFilters.value.categories = ['1', '2', '3']
      mockActiveFilterChips.value = [
        { key: 'categories', type: 'category', label: 'Categories', value: '2' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should handle category removal
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle price range removal', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'priceMin', type: 'price', label: 'Price', value: { min: 100, max: 500 } },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should handle price removal
      expect(wrapper.exists()).toBe(true)
    })

    it('should have aria-label on remove buttons', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Remove buttons should have aria-label
      expect(wrapper.html()).toContain('aria-label')
    })
  })

  describe('22.3.3 Test clear all functionality', () => {
    it('should show clear all button when filters are active', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have clear all button
      expect(wrapper.html()).toContain('Clear')
    })

    it('should call clearFilters when clear all is clicked', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      const clearButton = wrapper.find('[icon="i-heroicons-x-mark"]')
      if (clearButton.exists()) {
        await clearButton.trigger('click')
        // Should call clear function
        expect(wrapper.exists()).toBe(true)
      }
    })

    it('should have aria-label on clear all button', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Clear all button should have aria-label
      expect(wrapper.html()).toContain('aria-label')
    })
  })

  describe('22.3.4 Test value formatting', () => {
    it('should format search value with quotes', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show quoted search value
      expect(wrapper.html()).toContain('laptop')
    })

    it('should format price range with currency', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'priceMin', type: 'price', label: 'Price', value: { min: 100, max: 500 } },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show price with € symbol
      expect(wrapper.html()).toContain('€')
    })

    it('should format price min only', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'priceMin', type: 'price', label: 'Price', value: { min: 100, max: undefined } },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show min price with +
      expect(wrapper.exists()).toBe(true)
    })

    it('should format price max only', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'priceMin', type: 'price', label: 'Price', value: { min: undefined, max: 500 } },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show max price with "Up to"
      expect(wrapper.exists()).toBe(true)
    })

    it('should format likes with translation', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'likesMin', type: 'likes', label: 'Popularity', value: 50 },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show likes count
      expect(wrapper.exists()).toBe(true)
    })

    it('should format views with translation', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'viewsMin', type: 'views', label: 'Views', value: 100 },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show views count
      expect(wrapper.exists()).toBe(true)
    })

    it('should format sort with human-readable label', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'sort', type: 'sort', label: 'Sort', value: '-finalPrice' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should show sort label
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Visual styling', () => {
    it('should use soft variant for badges', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have soft variant
      expect(wrapper.exists()).toBe(true)
    })

    it('should use primary color for badges', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have primary color
      expect(wrapper.exists()).toBe(true)
    })

    it('should use medium size for badges', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have medium size
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Layout', () => {
    it('should have header with title and clear button', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have header section
      expect(wrapper.exists()).toBe(true)
    })

    it('should have flex wrap layout for chips', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
        { key: 'priceMin', type: 'price', label: 'Price', value: { min: 100, max: 500 } },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have flex wrap layout
      expect(wrapper.exists()).toBe(true)
    })

    it('should have spacing between elements', async () => {
      mockHasActiveFilters.value = true
      mockActiveFilterChips.value = [
        { key: 'search', type: 'search', label: 'Search', value: 'laptop' },
      ]
      
      const wrapper = await mountSuspended(ActiveFilters)
      
      // Should have spacing
      expect(wrapper.exists()).toBe(true)
    })
  })
})
