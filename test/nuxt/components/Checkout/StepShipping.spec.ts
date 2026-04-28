/**
 * Tests for Checkout/StepShipping.vue component.
 *
 * StepShipping renders a URadioGroup with two shipping options
 * (home_delivery / box_now_locker) and conditionally shows
 * CheckoutSelectedBoxNowLocker when box_now_locker is selected.
 */

import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StepShipping from '~/components/Checkout/StepShipping.vue'

// ---------------------------------------------------------------------------
// Helper: build a minimal formState for the component
// ---------------------------------------------------------------------------

function makeFormState(overrides: Record<string, unknown> = {}) {
  return {
    shippingMethod: 'home_delivery',
    boxnowLockerId: '',
    boxnowLocker: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Checkout/StepShipping', () => {
  describe('initial rendering', () => {
    it('mounts successfully', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState(),
          schema: null,
          partnerId: '10391',
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('renders a URadioGroup with the two shipping option values', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState(),
          schema: null,
          partnerId: '10391',
        },
      })

      const html = wrapper.html()
      // The radio items render their value attribute into the DOM
      expect(html).toContain('home_delivery')
      expect(html).toContain('box_now_locker')
    })

    it('does NOT render CheckoutSelectedBoxNowLocker when home_delivery is selected', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState({ shippingMethod: 'home_delivery' }),
          schema: null,
          partnerId: '10391',
        },
      })

      // The SelectedBoxNowLocker component is only present when isBoxNow is true
      const picker = wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' })
      expect(picker.exists()).toBe(false)
    })

    it('renders CheckoutSelectedBoxNowLocker when box_now_locker is selected', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState({ shippingMethod: 'box_now_locker' }),
          schema: null,
          partnerId: '10391',
        },
      })

      const picker = wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' })
      expect(picker.exists()).toBe(true)
    })
  })

  describe('submit button state', () => {
    it('submit button is disabled when box_now_locker is selected but no lockerId is set', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState({
            shippingMethod: 'box_now_locker',
            boxnowLockerId: '',
          }),
          schema: null,
          partnerId: '10391',
        },
      })

      // The continue / submit UButton has :disabled="!isValid"
      const submitBtn = wrapper.find('[type="submit"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('submit button is enabled when home_delivery is selected (no locker required)', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState({ shippingMethod: 'home_delivery', boxnowLockerId: '' }),
          schema: null,
          partnerId: '10391',
        },
      })

      const submitBtn = wrapper.find('[type="submit"]')
      // disabled attribute should not be present (or should be absent / "false")
      const disabled = submitBtn.attributes('disabled')
      expect(disabled === undefined || disabled === 'false').toBe(true)
    })

    it('submit button is enabled when box_now_locker is selected AND lockerId is set', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState({
            shippingMethod: 'box_now_locker',
            boxnowLockerId: '4',
          }),
          schema: null,
          partnerId: '10391',
        },
      })

      const submitBtn = wrapper.find('[type="submit"]')
      const disabled = submitBtn.attributes('disabled')
      expect(disabled === undefined || disabled === 'false').toBe(true)
    })
  })

  describe('event emissions', () => {
    it('emits "next" when the form is submitted with a valid home_delivery selection', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState({ shippingMethod: 'home_delivery' }),
          schema: null,
          partnerId: '10391',
        },
      })

      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('next')).toBeTruthy()
      expect(wrapper.emitted('next')!.length).toBeGreaterThanOrEqual(1)
    })

    it('emits "back" when the back button is clicked', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: {
          formState: makeFormState(),
          schema: null,
          partnerId: '10391',
        },
      })

      // Targeted selector — the URadioGroup options also render
      // [type="button"] elements for keyboard nav, so a generic
      // `[type="button"]` lookup picks the wrong element.
      const backBtn = wrapper.find('[data-testid="step-shipping-back"]')
      await backBtn.trigger('click')
      expect(wrapper.emitted('back')).toBeTruthy()
    })
  })
})
