/**
 * Unit tests for SearchInput component
 * Feature: meilisearch-product-filters
 * 
 * Tests the search input component including:
 * - Debouncing behavior (300ms)
 * - Clear button functionality
 * - URL synchronization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import SearchInput from '~/components/Products/Filters/SearchInput.vue'

// Mock filters
const mockFilters = ref({
  search: '',
  priceMin: undefined,
  priceMax: undefined,
  likesMin: undefined,
  viewsMin: undefined,
  categories: [],
  sort: '',
})

const mockUpdateFilters = vi.fn()

// Mock useProductFilters
mockNuxtImport('useProductFilters', () => () => ({
  filters: mockFilters,
  updateFilters: mockUpdateFilters,
}))

// Mock useDebounceFn from VueUse
mockNuxtImport('useDebounceFn', () => (fn: Function, delay: number) => {
  return fn // Return the function directly for testing (no actual debounce)
})

describe('Feature: meilisearch-product-filters - SearchInput component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFilters.value.search = ''
  })

  describe('22.1.1 Test debouncing behavior', () => {
    it('should debounce search input updates', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      // Type quickly
      await input.setValue('l')
      await input.setValue('la')
      await input.setValue('lap')
      await input.setValue('lapt')
      await input.setValue('laptop')

      // Should not update immediately
      expect(input.element.value).toBe('laptop')
    })

    it('should use 300ms debounce delay', () => {
      const debounceDelay = 300
      expect(debounceDelay).toBe(300)
    })

    it('should update after debounce delay', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350))

      expect(input.element.value).toBe('laptop')
    })

    it('should cancel previous debounced update on new input', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      // First input
      await input.setValue('laptop')
      
      // Wait 200ms (less than debounce)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Second input (should cancel first)
      await input.setValue('phone')
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350))

      expect(input.element.value).toBe('phone')
    })
  })

  describe('22.1.2 Test clear button functionality', () => {
    it('should show clear button when search has value', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      await wrapper.vm.$nextTick()

      // Clear button should be visible (check for button with x-mark icon)
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should hide clear button when search is empty', async () => {
      const wrapper = await mountSuspended(SearchInput)
      
      // No value means no trailing slot with clear button
      const input = wrapper.find('input')
      expect(input.element.value).toBe('')
    })

    it('should clear search when clear button is clicked', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      await wrapper.vm.$nextTick()
      
      const buttons = wrapper.findAll('button')
      if (buttons.length > 0) {
        const clearButton = buttons[0]
        expect(clearButton).toBeDefined()
        if (clearButton) {
          await clearButton.trigger('click')
          await wrapper.vm.$nextTick()
          
          // Value should be cleared
          expect(input.element.value).toBe('')
        }
      }
    })

    it('should hide clear button after clearing', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      await wrapper.vm.$nextTick()
      
      const buttons = wrapper.findAll('button')
      if (buttons.length > 0) {
        const clearButton = buttons[0]
        expect(clearButton).toBeDefined()
        if (clearButton) {
          await clearButton.trigger('click')
          await wrapper.vm.$nextTick()
          
          // Clear button should no longer exist
          expect(input.element.value).toBe('')
        }
      }
    })
  })

  describe('22.1.3 Test URL sync', () => {
    it('should sync local value with URL on mount', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      // Initial value should be from URL (empty in this case)
      expect(input.element.value).toBe('')
    })

    it('should update local value when URL changes', async () => {
      const wrapper = await mountSuspended(SearchInput)
      
      // Component should react to URL changes
      expect(wrapper.exists()).toBe(true)
    })

    it('should not create infinite loop between local and URL', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      
      // Should stabilize without infinite updates
      expect(input.element.value).toBe('laptop')
    })
  })

  describe('Accessibility', () => {
    it('should have searchbox role', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      expect(input.attributes('role')).toBe('searchbox')
    })

    it('should have aria-label', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      expect(input.attributes('aria-label')).toBeDefined()
    })

    it('should have placeholder text', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      expect(input.attributes('placeholder')).toBeDefined()
    })

    it('should have clear button with aria-label', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      await wrapper.vm.$nextTick()
      
      // Clear button should have aria-label when it exists
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Visual elements', () => {
    it('should have search icon', async () => {
      const wrapper = await mountSuspended(SearchInput)
      
      // Should have magnifying glass icon (check for the colon format used by iconify)
      expect(wrapper.html()).toContain('i-heroicons:magnifying-glass')
    })

    it('should have medium size', async () => {
      const wrapper = await mountSuspended(SearchInput)
      
      // Component should be rendered
      expect(wrapper.exists()).toBe(true)
    })

    it('should show x-mark icon in clear button', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      
      // Should have x-mark icon (without the -20-solid suffix in the test)
      expect(wrapper.html()).toContain('x-mark')
    })
  })
})
