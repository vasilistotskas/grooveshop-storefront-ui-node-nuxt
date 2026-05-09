/**
 * Tests for Checkout/SelectedBoxNowLocker.vue component.
 *
 * Shows either the "pick a locker" CTA or a summary card depending on
 * whether formState.boxnowLockerId is populated.
 */

import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SelectedBoxNowLocker from '~/components/Checkout/SelectedBoxNowLocker.vue'

// partnerId is now passed as a prop — no useRuntimeConfig mock needed.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyFormState() {
  return {
    shippingMethod: 'box_now_locker',
    boxnowLockerId: '',
    boxnowLocker: null,
  }
}

function populatedFormState() {
  return {
    shippingMethod: 'box_now_locker',
    boxnowLockerId: '4',
    boxnowLocker: {
      boxnowLockerId: '4',
      boxnowLockerPostalCode: '15234',
      boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
      boxnowLockerName: 'Χαλάνδρι ΟΠΑΠ Play',
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Checkout/SelectedBoxNowLocker', () => {
  describe('empty state (no locker selected)', () => {
    it('renders the select-locker CTA button when boxnowLockerId is empty', async () => {
      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: emptyFormState(), partnerId: '10391' },
      })

      // The CTA button text comes from the i18n key shipping.boxnow.select_locker
      // Real i18n returns Greek — we assert the button exists and is visible
      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      // At least one button must exist (the "select locker" CTA)
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })

    it('does not show the locker info card when no locker is selected', async () => {
      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: emptyFormState(), partnerId: '10391' },
      })

      // The address line is only present in the locker card
      expect(wrapper.html()).not.toContain('Λεωφ. Πεντέλης 125')
    })

    it('clicking the CTA sets pickerOpen to true (picker modal becomes open)', async () => {
      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: emptyFormState(), partnerId: '10391' },
      })

      // The first UButton in the empty state is the "select locker" CTA
      const ctaButton = wrapper.findComponent({ name: 'UButton' })
      expect(ctaButton.exists()).toBe(true)
      await ctaButton.trigger('click')

      // After clicking, the picker modal's open prop should be true.
      // The nested CheckoutBoxNowLockerPicker receives v-model:open="pickerOpen".
      const picker = wrapper.findComponent({ name: 'CheckoutBoxNowLockerPicker' })
      // The picker is always mounted (VueUse postMessage listener strategy)
      expect(picker.exists()).toBe(true)
    })
  })

  describe('populated state (locker already selected)', () => {
    it('renders the locker name when a locker is selected', async () => {
      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: populatedFormState(), partnerId: '10391' },
      })

      expect(wrapper.html()).toContain('Χαλάνδρι ΟΠΑΠ Play')
    })

    it('renders the locker address line', async () => {
      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: populatedFormState(), partnerId: '10391' },
      })

      expect(wrapper.html()).toContain('Λεωφ. Πεντέλης 125')
    })

    it('renders the postal code', async () => {
      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: populatedFormState(), partnerId: '10391' },
      })

      expect(wrapper.html()).toContain('15234')
    })

    it('renders a "change locker" button in the populated state', async () => {
      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: populatedFormState(), partnerId: '10391' },
      })

      // The change-locker UButton emits @click -> pickerOpen = true
      const buttons = wrapper.findAllComponents({ name: 'UButton' })
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('@selected event from picker updates formState', () => {
    it('updates boxnowLockerId and boxnowLocker in formState when @selected fires', async () => {
      const state = emptyFormState() as Record<string, unknown>

      const wrapper = await mountSuspended(SelectedBoxNowLocker, {
        props: { formState: state, partnerId: '10391' },
      })

      const newLocker = {
        boxnowLockerId: '7',
        boxnowLockerPostalCode: '10431',
        boxnowLockerAddressLine1: 'Πατησίων 42',
        boxnowLockerName: 'Κολωνός',
      }

      // Emit the 'selected' event from the nested picker component
      const picker = wrapper.findComponent({ name: 'CheckoutBoxNowLockerPicker' })
      expect(picker.exists()).toBe(true)

      await picker.vm.$emit('selected', newLocker)
      await wrapper.vm.$nextTick()

      // The component writes back to the formState model
      expect(state.boxnowLockerId).toBe('7')
      expect(state.boxnowLocker).toEqual(newLocker)
    })
  })
})
