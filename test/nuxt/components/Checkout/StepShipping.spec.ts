/**
 * Tests for Checkout/StepShipping.vue component.
 *
 * StepShipping renders a URadioGroup with two shipping options
 * (home_delivery / box_now_locker) and conditionally shows
 * CheckoutSelectedBoxNowLocker when box_now_locker is selected.
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StepShipping from '~/components/Checkout/StepShipping.vue'

// ---------------------------------------------------------------------------
// Helpers — keep test props centralised so future flag additions don't
// require a sweep across every test case
// ---------------------------------------------------------------------------

function makeFormState(overrides: Record<string, unknown> = {}) {
  return {
    shippingMethod: 'home_delivery',
    boxnowLockerId: '',
    boxnowLocker: null,
    ...overrides,
  }
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: makeFormState(),
    schema: null,
    partnerId: '10391',
    // Master switch — almost every test needs the BoxNow option
    // visible. Tests covering the hidden case override this to false.
    boxnowEnabled: true,
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
        props: makeProps(),
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('renders a URadioGroup with the two shipping option values', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps(),
      })

      const html = wrapper.html()
      // The radio items render their value attribute into the DOM
      expect(html).toContain('home_delivery')
      expect(html).toContain('box_now_locker')
    })

    it('omits the BoxNow row when boxnowEnabled is false (admin master switch)', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({ boxnowEnabled: false }),
      })

      const html = wrapper.html()
      // home_delivery still rendered, box_now_locker stripped from the
      // radio group entirely (not just disabled — see component
      // rationale: a greyed-out card invites confusion).
      expect(html).toContain('home_delivery')
      expect(html).not.toContain('box_now_locker')
    })

    it('does NOT render CheckoutSelectedBoxNowLocker when home_delivery is selected', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'home_delivery' }),
        }),
      })

      // The SelectedBoxNowLocker component is only present when isBoxNow is true
      const picker = wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' })
      expect(picker.exists()).toBe(false)
    })

    it('renders CheckoutSelectedBoxNowLocker when box_now_locker is selected', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'box_now_locker' }),
        }),
      })

      const picker = wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' })
      expect(picker.exists()).toBe(true)
    })
  })

  describe('submit button state', () => {
    it('submit button is disabled when box_now_locker is selected but no lockerId is set', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({
            shippingMethod: 'box_now_locker',
            boxnowLockerId: '',
          }),
        }),
      })

      // The continue / submit UButton has :disabled="!isValid"
      const submitBtn = wrapper.find('[type="submit"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()
    })

    it('submit button is enabled when home_delivery is selected (no locker required)', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'home_delivery', boxnowLockerId: '' }),
        }),
      })

      const submitBtn = wrapper.find('[type="submit"]')
      // disabled attribute should not be present (or should be absent / "false")
      const disabled = submitBtn.attributes('disabled')
      expect(disabled === undefined || disabled === 'false').toBe(true)
    })

    it('submit button is enabled when box_now_locker is selected AND lockerId is set', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({
            shippingMethod: 'box_now_locker',
            boxnowLockerId: '4',
          }),
        }),
      })

      const submitBtn = wrapper.find('[type="submit"]')
      const disabled = submitBtn.attributes('disabled')
      expect(disabled === undefined || disabled === 'false').toBe(true)
    })
  })

  describe('event emissions', () => {
    it('emits "next" when the form is submitted with a valid home_delivery selection', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'home_delivery' }),
        }),
      })

      await wrapper.find('form').trigger('submit')
      expect(wrapper.emitted('next')).toBeTruthy()
      expect(wrapper.emitted('next')!.length).toBeGreaterThanOrEqual(1)
    })

    it('emits "back" when the back button is clicked', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps(),
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
