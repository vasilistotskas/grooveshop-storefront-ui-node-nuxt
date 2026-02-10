import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoyaltyRedemption from '~/components/Loyalty/Redemption.vue'

// Mock the useLoyalty composable with new API
const mockSummaryRef = ref<any>(null)
const mockStatusRef = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const mockErrorRef = ref<any>(null)
const mockRefresh = vi.fn()

mockNuxtImport('useLoyalty', () => {
  return () => ({
    fetchSummary: () => ({
      data: mockSummaryRef,
      status: mockStatusRef,
      error: mockErrorRef,
      refresh: mockRefresh,
    }),
  })
})

// Mock useToast since the component uses it
mockNuxtImport('useToast', () => {
  return () => ({
    add: vi.fn(),
  })
})

describe('LoyaltyRedemption Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefresh.mockClear()
    mockSummaryRef.value = {
      pointsBalance: 100,
      totalXp: 500,
      level: 2,
      tier: null,
      pointsToNextTier: 400,
    }
    mockStatusRef.value = 'success'
    mockErrorRef.value = null
  })

  describe('Test 6: Client-side validation rejects over-balance redemption', () => {
    it('should display validation error when redemption amount exceeds available balance', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Set points via component VM (UInputNumber doesn't render plain input[type="number"])
      ;(wrapper.vm as any).formState.pointsToRedeem = 150
      await wrapper.vm.$nextTick()

      // Trigger form submission
      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should display validation error (Greek locale)
      expect(wrapper.text()).toContain('Δεν έχετε αρκετούς πόντους')

      // Should NOT emit redeemed event
      expect(wrapper.emitted('redeemed')).toBeUndefined()
    })

    it('should display validation error for zero points', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      ;(wrapper.vm as any).formState.pointsToRedeem = 0
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should display validation error (Greek locale)
      expect(wrapper.text()).toContain('Πρέπει να εξαργυρώσετε τουλάχιστον 1 πόντο')

      // Should NOT emit redeemed event
      expect(wrapper.emitted('redeemed')).toBeUndefined()
    })

    it('should display validation error for negative points', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      ;(wrapper.vm as any).formState.pointsToRedeem = -10
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should display validation error (Greek locale)
      expect(wrapper.text()).toContain('Πρέπει να εξαργυρώσετε τουλάχιστον 1 πόντο')

      // Should NOT emit redeemed event
      expect(wrapper.emitted('redeemed')).toBeUndefined()
    })

    it('should allow redemption when amount is within balance', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      ;(wrapper.vm as any).formState.pointsToRedeem = 50
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should NOT display validation error
      expect(wrapper.text()).not.toContain('Δεν έχετε αρκετούς πόντους')

      // Should emit redeemed event with local intent (no API call)
      const emittedEvents = wrapper.emitted('redeemed')
      expect(emittedEvents).toBeDefined()
      expect(emittedEvents![0]).toEqual([{
        amount: 0.50,
        currency: 'EUR',
        points: 50,
      }])
    })

    it('should allow redemption of exact balance amount', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      ;(wrapper.vm as any).formState.pointsToRedeem = 100
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should NOT display validation error
      expect(wrapper.text()).not.toContain('Δεν έχετε αρκετούς πόντους')

      // Should emit redeemed event
      const emittedEvents = wrapper.emitted('redeemed')
      expect(emittedEvents).toBeDefined()
      expect(emittedEvents![0]).toEqual([{
        amount: 1.00,
        currency: 'EUR',
        points: 100,
      }])
    })
  })

  describe('Test 7: Successful redemption updates displayed balance', () => {
    it('should update displayed balance after redemption', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Initial balance should be 100
      expect(wrapper.text()).toContain('100')

      ;(wrapper.vm as any).formState.pointsToRedeem = 50
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // After redemption, displayed balance should be 50 (100 - 50)
      expect(wrapper.text()).toContain('50')
    })

    it('should emit redeemed event with discount details including points', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      ;(wrapper.vm as any).formState.pointsToRedeem = 75
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should emit redeemed event with amount, currency, and points
      const emittedEvents = wrapper.emitted('redeemed')
      expect(emittedEvents).toBeDefined()
      expect(emittedEvents![0]).toEqual([{
        amount: 0.75,
        currency: 'EUR',
        points: 75,
      }])
    })

    it('should display success alert after redemption', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      ;(wrapper.vm as any).formState.pointsToRedeem = 100
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should display success alert with discount information (Greek locale)
      expect(wrapper.text()).toContain('Η έκπτωση εφαρμόστηκε')
      expect(wrapper.text()).toContain('Υπόλοιπο')
      expect(wrapper.text()).toContain('0')
    })

    it('should reset form after successful redemption', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      ;(wrapper.vm as any).formState.pointsToRedeem = 50
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 200))

      // Form state should be cleared
      expect((wrapper.vm as any).formState.pointsToRedeem).toBeUndefined()
    })
  })

  describe('Additional Functionality', () => {
    it('should display loading state while fetching summary', async () => {
      mockStatusRef.value = 'pending'
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

    it('should disable submit button when no points entered', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Submit button should be disabled when no points entered
      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()
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

      // Form state should be populated with full balance
      expect((wrapper.vm as any).formState.pointsToRedeem).toBe(250)
    })

    it('should emit cleared event when discount is dismissed', async () => {
      const wrapper = await mountSuspended(LoyaltyRedemption, {
        props: {
          currency: 'EUR',
        },
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))

      // Apply a discount first
      ;(wrapper.vm as any).formState.pointsToRedeem = 50
      await wrapper.vm.$nextTick()

      const form = wrapper.find('form')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      // Now clear the redemption via the VM
      ;(wrapper.vm as any).clearRedemption()
      await wrapper.vm.$nextTick()

      // Should emit cleared event
      expect(wrapper.emitted('cleared')).toBeDefined()
    })
  })
})
