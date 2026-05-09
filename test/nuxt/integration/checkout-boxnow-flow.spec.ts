/**
 * Light integration test for the BoxNow checkout flow.
 *
 * We verify that the StepShipping component wires correctly into a minimal
 * form context rather than rendering the full checkout page — that would
 * require mocking cart, address, payway, countries, regions, auth, and the
 * stepper, which is better covered by manual E2E testing against stage.
 *
 * TODO: Wire against the real checkout page once the following blockers are
 * resolved:
 *   1. `mountSuspended(CheckoutPage)` requires mocking ~10 composables and
 *      5 API endpoints (cart, countries, regions, pay_way, user) and is
 *      fragile to checkout-page structural changes.
 *   2. The stepper step count (3 items) can be verified more reliably via
 *      the checkout page's `<UStepper>` once test-utils adds first-class
 *      stepper introspection.
 *
 * Current tests exercise the key integration points at the component level.
 */

import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import StepShipping from '~/components/Checkout/StepShipping.vue'

// partnerId is now a required prop on StepShipping → no `useRuntimeConfig`
// mock needed here. Module-level `mockNuxtImport('useRuntimeConfig', ...)`
// breaks `@nuxt/test-utils` setupNuxt() — it reads
// `runtimeConfig.app.baseURL` at bootstrap which the mock would shadow.

// Register endpoint mocks for the API routes the checkout flow uses.
// These mock Nitro server routes but note that direct $fetch calls from
// composables bypass registerEndpoint (documented in CLAUDE.md).

registerEndpoint('/api/cart', {
  method: 'GET',
  handler: () => ({
    id: 'test-cart-id',
    items: [],
    totalPrice: '0.00',
  }),
})

registerEndpoint('/api/countries', {
  method: 'GET',
  handler: () => ({ count: 1, results: [{ alpha2: 'GR', name: 'Greece' }] }),
})

registerEndpoint('/api/regions', {
  method: 'GET',
  handler: () => ({ count: 1, results: [{ alpha: 'AT', name: 'Αττική' }] }),
})

registerEndpoint('/api/pay_way', {
  method: 'GET',
  handler: () => ({
    count: 2,
    results: [
      { id: 1, name: 'Card', isOnlinePayment: true },
      { id: 2, name: 'Cash', isOnlinePayment: false },
    ],
  }),
})

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('BoxNow Checkout Integration', () => {
  describe('StepShipping within a form context', () => {
    it('renders correctly in isolation with default home_delivery selection', async () => {
      const formState = {
        shippingMethod: 'home_delivery',
        boxnowLockerId: '',
        boxnowLocker: null,
      }

      const wrapper = await mountSuspended(StepShipping, {
        // ``boxnowEnabled: true`` mirrors the prod-after-activation
        // state — the master switch is on so the BoxNow row renders.
        props: { formState, schema: null, partnerId: '10391', boxnowEnabled: true },
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.html()).toContain('home_delivery')
      expect(wrapper.html()).toContain('box_now_locker')
    })

    it('transitions from home_delivery to box_now_locker shows the locker picker section', async () => {
      const formState = reactive({
        shippingMethod: 'home_delivery',
        boxnowLockerId: '',
        boxnowLocker: null,
      })

      const wrapper = await mountSuspended(StepShipping, {
        props: { formState, schema: null, partnerId: '10391', boxnowEnabled: true },
      })

      // Initially no picker
      expect(wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' }).exists()).toBe(false)

      // Switch to box_now_locker
      formState.shippingMethod = 'box_now_locker'
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' }).exists()).toBe(true)
    })

    it('submit with home_delivery selected emits "next"', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: { shippingMethod: 'home_delivery', boxnowLockerId: '', boxnowLocker: null },
          schema: null,
          partnerId: '10391',
          boxnowEnabled: true,
        },
      })

      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('next')).toBeTruthy()
    })

    it('submit with box_now_locker and a valid lockerId emits "next"', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: {
            shippingMethod: 'box_now_locker',
            boxnowLockerId: '4',
            boxnowLocker: {
              boxnowLockerId: '4',
              boxnowLockerPostalCode: '15234',
              boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
            },
          },
          schema: null,
          partnerId: '10391',
          boxnowEnabled: true,
        },
      })

      // Submit button should not be disabled
      const submitBtn = wrapper.find('[type="submit"]')
      const disabled = submitBtn.attributes('disabled')
      expect(disabled === undefined || disabled === 'false').toBe(true)

      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('next')).toBeTruthy()
    })
  })

  // TODO: Full checkout page stepper integration test
  // Skipping because rendering the full checkout page requires:
  //   - Auth store setup (useAuthStore)
  //   - Cart store setup (useCartStore)
  //   - Mocking useCheckoutForm, useCheckoutSubmit, useCheckout
  //   - Mocking pay_way, countries, regions API responses
  //   - A Nuxt router configured with the /checkout route
  // Once we have a shared checkout page test helper, add:
  //   it('checkout stepper has 3 items (info_and_address, shipping, payment)', ...)
  describe.skip('Full checkout page (blocked)', () => {
    it('stepper has 3 items', () => {
      // TODO: implement when checkout page test infrastructure is available
    })
  })
})
