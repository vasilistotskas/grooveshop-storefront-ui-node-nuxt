import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoyaltyTransactions from '~/components/Loyalty/Transactions.vue'

// Mock the useLoyalty composable with new API
const mockTransactionsRef = ref<any>(null)
const mockStatusRef = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const mockErrorRef = ref<any>(null)
const mockRefresh = vi.fn()

mockNuxtImport('useLoyalty', () => {
  return () => ({
    fetchTransactions: () => ({
      data: mockTransactionsRef,
      status: mockStatusRef,
      error: mockErrorRef,
      refresh: mockRefresh,
    }),
  })
})

describe('LoyaltyTransactions Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefresh.mockClear()
    mockTransactionsRef.value = null
    mockStatusRef.value = 'idle'
    mockErrorRef.value = null
  })

  describe('Test 4: Transaction list renders all required fields per item', () => {
    it('should render all transaction fields: points, type, description, and date', async () => {
      mockTransactionsRef.value = {
        count: 3,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 100,
            transactionType: 'EARN',
            referenceOrder: 12345,
            description: 'Points earned from order #12345',
            createdAt: '2024-01-15T10:30:00Z',
          },
          {
            id: 2,
            points: -50,
            transactionType: 'REDEEM',
            referenceOrder: null,
            description: 'Points redeemed for discount',
            createdAt: '2024-01-14T15:45:00Z',
          },
          {
            id: 3,
            points: 25,
            transactionType: 'BONUS',
            referenceOrder: null,
            description: 'Birthday bonus points',
            createdAt: '2024-01-13T09:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      // Wait for component to mount and fetch
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Verify all transactions are rendered
      expect(wrapper.text()).toContain('+100')
      expect(wrapper.text()).toContain('-50')
      expect(wrapper.text()).toContain('+25')

      // Verify transaction types are displayed (Greek locale)
      expect(wrapper.text()).toContain('Κέρδος') // Earn
      expect(wrapper.text()).toContain('Εξαργύρωση') // Redeem
      expect(wrapper.text()).toContain('Μπόνους') // Bonus

      // Verify descriptions are displayed
      expect(wrapper.text()).toContain('Points earned from order #12345')
      expect(wrapper.text()).toContain('Points redeemed for discount')
      expect(wrapper.text()).toContain('Birthday bonus points')

      // Verify dates are formatted and displayed
      const text = wrapper.text()
      expect(text).toMatch(/Ιαν|15|2024/) // Greek month abbreviation
    })

    it('should render each transaction with all four required fields', async () => {
      mockTransactionsRef.value = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 150,
            transactionType: 'EARN',
            referenceOrder: 99999,
            description: 'Test transaction',
            createdAt: '2024-02-20T12:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const text = wrapper.text()

      // 1. Points field
      expect(text).toContain('+150')

      // 2. Transaction type field (Greek)
      expect(text).toContain('Κέρδος')

      // 3. Description field
      expect(text).toContain('Test transaction')

      // 4. Date field (formatted)
      expect(text).toMatch(/Φεβ|20|2024/)
    })

    it('should render multiple transactions with different types', async () => {
      mockTransactionsRef.value = {
        count: 5,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 100,
            transactionType: 'EARN',
            referenceOrder: null,
            description: 'Earned points',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            points: -75,
            transactionType: 'REDEEM',
            referenceOrder: null,
            description: 'Redeemed points',
            createdAt: '2024-01-02T00:00:00Z',
          },
          {
            id: 3,
            points: -10,
            transactionType: 'EXPIRE',
            referenceOrder: null,
            description: 'Expired points',
            createdAt: '2024-01-03T00:00:00Z',
          },
          {
            id: 4,
            points: 5,
            transactionType: 'ADJUST',
            referenceOrder: null,
            description: 'Adjustment',
            createdAt: '2024-01-04T00:00:00Z',
          },
          {
            id: 5,
            points: 50,
            transactionType: 'BONUS',
            referenceOrder: null,
            description: 'Bonus points',
            createdAt: '2024-01-05T00:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify all transaction types are rendered (Greek)
      expect(wrapper.text()).toContain('Κέρδος') // Earn
      expect(wrapper.text()).toContain('Εξαργύρωση') // Redeem
      expect(wrapper.text()).toContain('Λήξη') // Expire
      expect(wrapper.text()).toContain('Προσαρμογή') // Adjust
      expect(wrapper.text()).toContain('Μπόνους') // Bonus

      // Verify all descriptions are rendered
      expect(wrapper.text()).toContain('Earned points')
      expect(wrapper.text()).toContain('Redeemed points')
      expect(wrapper.text()).toContain('Expired points')
      expect(wrapper.text()).toContain('Adjustment')
      expect(wrapper.text()).toContain('Bonus points')
    })

    it('should format dates correctly for display', async () => {
      mockTransactionsRef.value = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 100,
            transactionType: 'EARN',
            referenceOrder: null,
            description: 'Test',
            createdAt: '2024-03-15T14:30:45Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Date should be formatted (Greek locale)
      const text = wrapper.text()
      expect(text).toMatch(/Μαρ|15|2024/)
    })
  })

  describe('Test 5: Transaction points are color-coded by sign', () => {
    it('should use green color class for positive points', async () => {
      mockTransactionsRef.value = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 100,
            transactionType: 'EARN',
            referenceOrder: null,
            description: 'Positive points',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Find the points element
      const html = wrapper.html()

      // Should contain success color class for positive points
      expect(html).toMatch(/text-success/)

      // Should display with + sign
      expect(wrapper.text()).toContain('+100')
    })

    it('should use red color class for negative points', async () => {
      mockTransactionsRef.value = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: -50,
            transactionType: 'REDEEM',
            referenceOrder: null,
            description: 'Negative points',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Find the points element
      const html = wrapper.html()

      // Should contain error color class for negative points
      expect(html).toMatch(/text-error/)

      // Should display negative number
      expect(wrapper.text()).toContain('-50')
    })

    it('should color-code multiple transactions correctly', async () => {
      mockTransactionsRef.value = {
        count: 4,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 100,
            transactionType: 'EARN',
            referenceOrder: null,
            description: 'Positive 1',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            points: -50,
            transactionType: 'REDEEM',
            referenceOrder: null,
            description: 'Negative 1',
            createdAt: '2024-01-02T00:00:00Z',
          },
          {
            id: 3,
            points: 75,
            transactionType: 'BONUS',
            referenceOrder: null,
            description: 'Positive 2',
            createdAt: '2024-01-03T00:00:00Z',
          },
          {
            id: 4,
            points: -25,
            transactionType: 'EXPIRE',
            referenceOrder: null,
            description: 'Negative 2',
            createdAt: '2024-01-04T00:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const html = wrapper.html()

      // Should have both success and error color classes
      expect(html).toMatch(/text-success/)
      expect(html).toMatch(/text-error/)

      // Should display positive points with + sign
      expect(wrapper.text()).toContain('+100')
      expect(wrapper.text()).toContain('+75')

      // Should display negative points
      expect(wrapper.text()).toContain('-50')
      expect(wrapper.text()).toContain('-25')
    })

    it('should apply different colors to EARN vs REDEEM transactions', async () => {
      mockTransactionsRef.value = {
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 200,
            transactionType: 'EARN',
            referenceOrder: null,
            description: 'Earned',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            points: -100,
            transactionType: 'REDEEM',
            referenceOrder: null,
            description: 'Redeemed',
            createdAt: '2024-01-02T00:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      const html = wrapper.html()

      // EARN (positive) should have success color
      expect(html).toMatch(/text-success/)

      // REDEEM (negative) should have error color
      expect(html).toMatch(/text-error/)
    })

    it('should handle zero points (edge case)', async () => {
      mockTransactionsRef.value = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            points: 0,
            transactionType: 'ADJUST',
            referenceOrder: null,
            description: 'Zero adjustment',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Zero points should use error color (not positive)
      const html = wrapper.html()
      expect(html).toMatch(/text-error/)

      // Should display 0
      expect(wrapper.text()).toContain('0')
    })
  })

  describe('Filter Functionality', () => {
    it('should render filter controls for transaction type and dates', async () => {
      mockTransactionsRef.value = { count: 0, results: [], next: null, previous: null }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should have transaction type select
      const select = wrapper.findComponent({ name: 'USelect' })
      expect(select.exists()).toBe(true)

      // Should have date inputs
      const inputs = wrapper.findAllComponents({ name: 'UInput' })
      expect(inputs.length).toBeGreaterThanOrEqual(2)
    })

    it('should reset page to 1 when filter changes', async () => {
      mockTransactionsRef.value = { count: 0, results: [], next: null, previous: null }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Set page to 2 via VM
      ;(wrapper.vm as any).currentPage = 2
      await wrapper.vm.$nextTick()

      // Change the transaction type filter
      const select = wrapper.findComponent({ name: 'USelect' })
      await select.vm.$emit('update:modelValue', 'EARN')
      await wrapper.vm.$nextTick()

      // Page should be reset to 1
      expect((wrapper.vm as any).currentPage).toBe(1)
    })
  })

  describe('Empty and Error States', () => {
    it('should display empty state when no transactions', async () => {
      mockTransactionsRef.value = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Greek: "Δεν βρέθηκαν συναλλαγές"
      expect(wrapper.text()).toContain('Δεν βρέθηκαν συναλλαγές')
    })

    it('should display loading skeleton when loading', async () => {
      mockStatusRef.value = 'pending'
      mockTransactionsRef.value = null

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()

      const skeletons = wrapper.findAllComponents({ name: 'USkeleton' })
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should display error message with retry button', async () => {
      mockErrorRef.value = new Error('Network error')
      mockTransactionsRef.value = null

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Greek: "Αποτυχία φόρτωσης συναλλαγών"
      expect(wrapper.text()).toContain('Αποτυχία φόρτωσης συναλλαγών')

      // Greek: "Δοκιμάστε ξανά"
      const retryButton = wrapper.findAll('button').find(btn => btn.text().includes('Δοκιμάστε ξανά'))
      expect(retryButton).toBeDefined()

      await retryButton!.trigger('click')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('Pagination', () => {
    it('should display pagination when there are multiple pages', async () => {
      mockTransactionsRef.value = {
        count: 50,
        totalPages: 5,
        pageSize: 12,
        next: 'http://api/transactions?page=2',
        previous: null,
        results: Array(10).fill(null).map((_, i) => ({
          id: i + 1,
          points: 100,
          transactionType: 'EARN',
          referenceOrder: null,
          description: `Transaction ${i + 1}`,
          createdAt: '2024-01-01T00:00:00Z',
        })),
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should display pagination component
      const pagination = wrapper.findComponent({ name: 'UPagination' })
      expect(pagination.exists()).toBe(true)
    })

    it('should not display pagination when only one page', async () => {
      mockTransactionsRef.value = {
        count: 5,
        totalPages: 1,
        pageSize: 12,
        next: null,
        previous: null,
        results: Array(5).fill(null).map((_, i) => ({
          id: i + 1,
          points: 100,
          transactionType: 'EARN',
          referenceOrder: null,
          description: `Transaction ${i + 1}`,
          createdAt: '2024-01-01T00:00:00Z',
        })),
      }

      const wrapper = await mountSuspended(LoyaltyTransactions)

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not display pagination component
      const pagination = wrapper.findComponent({ name: 'UPagination' })
      expect(pagination.exists()).toBe(false)
    })
  })
})
