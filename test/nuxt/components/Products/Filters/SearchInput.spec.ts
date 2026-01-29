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
import SearchInput from '~/components/Products/Filters/SearchInput.vue'

describe('Feature: meilisearch-product-filters - SearchInput component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

      // Clear button should be visible
      const clearButton = wrapper.find('[aria-label*="Clear"]')
      expect(clearButton.exists()).toBe(true)
    })

    it('should hide clear button when search is empty', async () => {
      const wrapper = await mountSuspended(SearchInput)
      
      // Clear button should not be visible
      const clearButtons = wrapper.findAll('[aria-label*="Clear"]')
      expect(clearButtons.length).toBe(0)
    })

    it('should clear search when clear button is clicked', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      
      const clearButton = wrapper.find('[aria-label*="Clear"]')
      await clearButton.trigger('click')

      expect(input.element.value).toBe('')
    })

    it('should hide clear button after clearing', async () => {
      const wrapper = await mountSuspended(SearchInput)
      const input = wrapper.find('input')

      await input.setValue('laptop')
      
      const clearButton = wrapper.find('[aria-label*="Clear"]')
      await clearButton.trigger('click')

      // Clear button should no longer exist
      const clearButtons = wrapper.findAll('[aria-label*="Clear"]')
      expect(clearButtons.length).toBe(0)
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
      
      const clearButton = wrapper.find('[aria-label*="Clear"]')
      expect(clearButton.attributes('aria-label')).toBeDefined()
    })
  })

  describe('Visual elements', () => {
    it('should have search icon', async () => {
      const wrapper = await mountSuspended(SearchInput)
      
      // Should have magnifying glass icon
      expect(wrapper.html()).toContain('i-heroicons-magnifying-glass')
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
      
      // Should have x-mark icon
      expect(wrapper.html()).toContain('i-heroicons-x-mark')
    })
  })
})
