/**
 * Tests for Checkout/StepPayment.vue.
 *
 * Two operator-authored HTML fields reach this step from Django admin:
 * a short `description` rendered under each radio, and `instructions`
 * for the selected method. The instructions used to render expanded in
 * a UAlert — 500-700 characters with a numbered list — which pushed the
 * order summary and the place-order CTA below the fold on a phone. They
 * now sit behind a UCollapsible, and these tests pin the three things
 * that made that safe: collapsed by default, opens on demand, and
 * collapses again when the method changes so the panel never shows one
 * method's steps under another's name.
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import StepPayment from '~/components/Checkout/StepPayment.vue'

const CARD_INSTRUCTIONS
  = '<p>Η πληρωμή ολοκληρώνεται online με <strong>κάρτα</strong>.</p>'
  + '<ol><li>Μεταφέρεσαι σε ασφαλές τραπεζικό περιβάλλον.</li></ol>'

const COD_INSTRUCTIONS
  = '<p>Πληρώνεις σε <strong>μετρητά</strong> στον διανομέα.</p>'

function makePayWayOptions() {
  return [
    {
      label: 'Πληρωμή με Κάρτα',
      value: 6,
      description: 'Πληρωμή online με χρεωστική ή πιστωτική κάρτα.',
      instructions: CARD_INSTRUCTIONS,
      freeThresholdHint: '',
    },
    {
      label: 'Αντικαταβολή (+2,99 €)',
      value: 5,
      description: '<div>Πληρωμή σε μετρητά κατά την παράδοση</div>',
      instructions: COD_INSTRUCTIONS,
      freeThresholdHint: 'Δωρεάν για παραγγελίες άνω των 50,00 €',
    },
    {
      label: 'Χωρίς οδηγίες',
      value: 7,
      description: '',
      instructions: '',
      freeThresholdHint: '',
    },
  ]
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: { payWay: 6 },
    schema: null,
    payWayOptions: makePayWayOptions(),
    isSubmitting: false,
    ...overrides,
  }
}

/** The UCollapsible trigger, or undefined when there are no
 *  instructions to disclose. */
function findTrigger(wrapper: VueWrapper) {
  return wrapper
    .findAll('button')
    .find(button => button.text().includes('Οδηγίες πληρωμής'))
}

describe('Checkout/StepPayment', () => {
  describe('payment method descriptions', () => {
    it('renders each method description as HTML, not escaped text', async () => {
      const wrapper = await mountSuspended(StepPayment, { props: makeProps() })

      const html = wrapper.html()
      // TinyMCE stores a <div> wrapper; rendering it as text would
      // print the tag to the shopper.
      expect(html).toContain('Πληρωμή σε μετρητά κατά την παράδοση')
      expect(html).not.toContain('&lt;div&gt;')
    })

    it('renders the free-threshold hint beside the surcharge', async () => {
      const wrapper = await mountSuspended(StepPayment, { props: makeProps() })

      expect(wrapper.html()).toContain('Δωρεάν για παραγγελίες άνω των 50,00 €')
    })
  })

  describe('instructions disclosure', () => {
    it('is collapsed by default, so the CTA stays above the fold', async () => {
      const wrapper = await mountSuspended(StepPayment, { props: makeProps() })

      expect(findTrigger(wrapper)).toBeTruthy()
      // UCollapsible unmounts its content while closed.
      expect(wrapper.html()).not.toContain('ασφαλές τραπεζικό περιβάλλον')
    })

    it('reveals the selected method instructions when opened', async () => {
      const wrapper = await mountSuspended(StepPayment, { props: makeProps() })

      await findTrigger(wrapper)!.trigger('click')
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.html()).toContain('ασφαλές τραπεζικό περιβάλλον')
    })

    it('collapses again when the payment method changes', async () => {
      const wrapper = await mountSuspended(StepPayment, { props: makeProps() })

      await findTrigger(wrapper)!.trigger('click')
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(wrapper.html()).toContain('ασφαλές τραπεζικό περιβάλλον')

      // The shopper picks cash on delivery. Leaving the panel open would
      // show the card steps under the cash-on-delivery heading.
      await wrapper.setProps({ formState: { payWay: 5 } })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.html()).not.toContain('ασφαλές τραπεζικό περιβάλλον')
      expect(wrapper.html()).not.toContain('μετρητά</strong> στον διανομέα')
    })

    it('renders no trigger at all for a method without instructions', async () => {
      const wrapper = await mountSuspended(StepPayment, {
        props: makeProps({ formState: { payWay: 7 } }),
      })

      expect(findTrigger(wrapper)).toBeUndefined()
    })
  })
})
