import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoyaltyRedemption from '~/components/Loyalty/Redemption.vue'

// Mock the useLoyalty composable
const mockSummaryRef = ref<any>(null)
const mockLoadingRef = ref(false)
const mockErrorRef = ref<any>(null)

const mockFetchSummary = vi.fn().mockImplementation(async () => {
  mockLoadingRef.value = true
  await new Promise(resolve => setTimeout(resolve, 10))
  mockLoadingRef.value = false
})

const mockRedeemPoints = vi.fn()

mockNuxtImport('useLoyalty', () => {
  return () => ({
    summary: mockSummaryRef,
    loading: mockLoadingRef,
    error: mockErrorRef,
    fetchSummary: mockFetchSummary,
    redeemPoints: mockRedeemPoints,
  })
})

describe('LoyaltyRedemption Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchSummary.mockClear().mockImplementation(async () => {
      mockLoadingRef.value = true
      await new Promise(resolve => setTimeout(resolve, 10))
      mockLoadingRef.value = false
    })
    mockRedeemPoints.mockClear()
    mockSummaryRef.value = {
      pointsBalance: 100,
      totalXp: 500,
      level: 2,
      tier: null,
      pointsToNextTier: 400,
    }
    mockLoadingRef.value = false
    mockErrorRef.value = null
  })

  describe('Test 6: Client-side validation rejects over-balance redemption', () => {
    it('should display validation error when redemption amount exceeds available balance', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      // Wait for component to mount and fetch
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Find the points input field
      const input = wrapper.find('input[type="number"]')
      expect(input.exists()).toBe(true)

      // Try to redeem more points than available (150 > 100)
      await input.setValue('150')
      await wrapper.vm.$nextTick()

      // Trigger form submission
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      // Should display validation error (Greek locale)
      expect(wrapper.text()).toContain("Δεν έχετε αρκετούς πόντους")

      // Should NOT call the redeem API endpoint
      expect(mockRedeemPoints).not.toHaveBeenCalled()
    })

    it('should display validation error for zero points', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('0')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      // Should display validation error (Greek locale)
      expect(wrapper.text()).toContain('Πρέπει να εξαργυρώσετε τουλάχιστον 1 πόντο')

      // Should NOT call the API
      expect(mockRedeemPoints).not.toHaveBeenCalled()
    })

    it('should display validation error for negative points', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('-10')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      // Should display validation error (Greek locale)
      expect(wrapper.text()).toContain('Πρέπει να εξαργυρώσετε τουλάχιστον 1 πόντο')

      // Should NOT call the API
      expect(mockRedeemPoints).not.toHaveBeenCalled()
    })

    it('should allow redemption when amount is within balance', async () => {
      mockRedeemPoints.mockResolvedValue({
        discountAmount: 5.00,
        currency: 'EUR',
        pointsRedeemed: 50,
        remainingBalance: 50,
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('50')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should NOT display validation error
      expect(wrapper.text()).not.toContain("Δεν έχετε αρκετούς πόντους")

      // Should call the API with correct parameters
      expect(mockRedeemPoints).toHaveBeenCalledWith({
        pointsAmount: 50,
        currency: 'EUR',
      })
    })

    it('should allow redemption of exact balance amount', async () => {
      mockRedeemPoints.mockResolvedValue({
        discountAmount: 10.00,
        currency: 'EUR',
        pointsRedeemed: 100,
        remainingBalance: 0,
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('100')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should NOT display validation error
      expect(wrapper.text()).not.toContain("Δεν έχετε αρκετούς πόντους")

      // Should call the API
      expect(mockRedeemPoints).toHaveBeenCalledWith({
        pointsAmount: 100,
        currency: 'EUR',
      })
    })
  })

  describe('Test 7: Successful redemption updates displayed balance', () => {
    it('should update displayed balance to remainingBalance after successful redemption', async () => {
      mockRedeemPoints.mockResolvedValue({
        discountAmount: 5.00,
        currency: 'EUR',
        pointsRedeemed: 50,
        remainingBalance: 50,
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Initial balance should be 100
      expect(wrapper.text()).toContain('100')

      const input = wrapper.find('input[type="number"]')
      await input.setValue('50')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      // Wait for async operation
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // After redemption, should display remaining balance (50)
      expect(wrapper.text()).toContain('50')
    })

    it('should emit redeemed event with discount details', async () => {
      mockRedeemPoints.mockResolvedValue({
        discountAmount: 7.50,
        currency: 'EUR',
        pointsRedeemed: 75,
        remainingBalance: 25,
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('75')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      // Wait for async operation
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should emit redeemed event
      const emittedEvents = wrapper.emitted('redeemed')
      expect(emittedEvents).toBeDefined()
      expect(emittedEvents![0]).toEqual([{
        amount: 7.50,
        currency: 'EUR',
      }])
    })

    it('should display success message after redemption', async () => {
      mockRedeemPoints.mockResolvedValue({
        discountAmount: 10.00,
        currency: 'EUR',
        pointsRedeemed: 100,
        remainingBalance: 0,
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('100')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      // Wait for async operation
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should display success alert with discount information (Greek locale)
      expect(wrapper.text()).toContain('Η έκπτωση εφαρμόστηκε')
      expect(wrapper.text()).toContain('Υπόλοιπο')
      expect(wrapper.text()).toContain('0')
    })

    it('should reset form after successful redemption', async () => {
      mockRedeemPoints.mockResolvedValue({
        discountAmount: 5.00,
        currency: 'EUR',
        pointsRedeemed: 50,
        remainingBalance: 50,
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('50')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      // Wait for async operation
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // Input should be cleared
      expect((input.element as HTMLInputElement).value).toBe('')
    })
  })

  describe('Additional Functionality', () => {
    it('should display loading state while fetching summary', async () => {
      mockLoadingRef.value = true
      mockSummaryRef.value = null

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()

      // Should display skeleton loading components
      const skeletons = wrapper.findAllComponents({ name: 'USkeleton' })
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should disable submit button while redemption is in progress', async () => {
      mockRedeemPoints.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve({
          discountAmount: 5.00,
          currency: 'EUR',
          pointsRedeemed: 50,
          remainingBalance: 50,
        }), 1000))
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('50')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Submit button should show loading state
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should display API error message when redemption fails', async () => {
      mockRedeemPoints.mockRejectedValue({
        data: {
          detail: 'Insufficient points balance',
        },
      })

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      const input = wrapper.find('input[type="number"]')
      await input.setValue('50')
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')

      // Wait for async operation
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should display error message
      expect(wrapper.text()).toContain('Insufficient points balance')
    })

    it('should populate input with full balance when "Redeem All" button is clicked', async () => {
      mockSummaryRef.value = {
        pointsBalance: 250,
        totalXp: 1000,
        level: 3,
        tier: null,
        pointsToNextTier: 500,
      }

      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Find the "Redeem All" button (Greek: "Εξαργύρωση όλων")
      const buttons = wrapper.findAll('button')
      const redeemAllButton = buttons.find(btn => btn.text().includes('όλων'))
      expect(redeemAllButton).toBeDefined()

      await redeemAllButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Input should be populated with full balance
      const input = wrapper.find('input[type="number"]')
      expect((input.element as HTMLInputElement).value).toBe('250')
    })
  })
})
