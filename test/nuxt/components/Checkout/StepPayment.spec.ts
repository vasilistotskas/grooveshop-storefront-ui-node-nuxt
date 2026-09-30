import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import StepPayment from '~/components/Checkout/StepPayment.vue'
import WebsideStepPayment from '~/components/variants/webside/Checkout/StepPayment.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The payment step. Two operator-authored HTML fields reach it from
 * Django admin: a short `description` under each method, and
 * `instructions` for the chosen one. The instructions used to render
 * expanded — 500-700 characters with a numbered list — which pushed the
 * order summary and the place-order CTA below the fold on a phone. They
 * sit behind a disclosure now: collapsed by default, open on demand, and
 * collapsed again when the method changes so one method's steps never
 * show under another's name.
 *
 * The frozen webside copy differs only in its Greek-only i18n block.
 */

const CARD_INSTRUCTIONS
  = '<p>Η πληρωμή ολοκληρώνεται online με <strong>κάρτα</strong>.</p>'
  + '<ol><li>Μεταφέρεσαι σε ασφαλές τραπεζικό περιβάλλον.</li></ol>'

const COD_INSTRUCTIONS = '<p>Πληρώνεις σε <strong>μετρητά</strong> στον διανομέα.</p>'

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
    formState: reactive<Record<string, any>>({ payWay: 6 }),
    schema: null,
    payWayOptions: makePayWayOptions(),
    isSubmitting: false,
    ...overrides,
  }
}

function buttonByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find(button => button.text().includes(text))
}

describe.each(trees(StepPayment, WebsideStepPayment))('$tree Checkout/StepPayment', ({ C }) => {
  const mount = (overrides: Record<string, unknown> = {}) =>
    mountSuspended(C, { route: false, props: makeProps(overrides) })

  /** The disclosure's trigger, or undefined when there is nothing to disclose. */
  const trigger = (wrapper: VueWrapper) => buttonByText(wrapper, 'Οδηγίες πληρωμής')

  describe('payment method descriptions', () => {
    it('renders each method description as HTML, not escaped text', async () => {
      const wrapper = await mount()

      // TinyMCE stores a <div> wrapper; escaping it would print the tag.
      expect(wrapper.text()).toContain('Πληρωμή σε μετρητά κατά την παράδοση')
      expect(wrapper.html()).not.toContain('&lt;div&gt;')
    })

    it('renders the free-threshold hint beside the surcharge', async () => {
      const wrapper = await mount()

      expect(wrapper.text()).toContain('Δωρεάν για παραγγελίες άνω των 50,00 €')
    })

    it('strips scripts and event handlers from the operator HTML', async () => {
      const options = makePayWayOptions()
      options[0]!.description = '<p>Ασφαλής πληρωμή</p><script>window.pwned = 1</script><img src="x" onerror="window.pwned = 1">'
      options[0]!.instructions = '<p>Βήματα</p><script>window.pwned = 2</script><a href="javascript:alert(1)" onclick="alert(1)">link</a>'
      const wrapper = await mount({ payWayOptions: options })
      await trigger(wrapper)!.trigger('click')
      await flushPromises()

      const html = wrapper.html()
      expect(wrapper.text()).toContain('Ασφαλής πληρωμή')
      expect(wrapper.text()).toContain('Βήματα')
      expect(html).not.toContain('<script')
      expect(html).not.toContain('onerror')
      expect(html).not.toContain('onclick')
      expect(html).not.toContain('javascript:')
    })
  })

  describe('instructions disclosure', () => {
    it('is collapsed by default, so the CTA stays above the fold', async () => {
      const wrapper = await mount()

      expect(trigger(wrapper)).toBeDefined()
      // UCollapsible unmounts its content while closed.
      expect(wrapper.text()).not.toContain('ασφαλές τραπεζικό περιβάλλον')
    })

    it('reveals the selected method\'s instructions when opened', async () => {
      const wrapper = await mount()

      await trigger(wrapper)!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('ασφαλές τραπεζικό περιβάλλον')
      expect(wrapper.text()).not.toContain('στον διανομέα')
    })

    it('collapses again when the shopper picks another method', async () => {
      const formState = reactive<Record<string, any>>({ payWay: 6 })
      const wrapper = await mount({ formState })
      await trigger(wrapper)!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('ασφαλές τραπεζικό περιβάλλον')

      await wrapper.find('[role="radio"][value="5"]').trigger('click')
      await flushPromises()

      expect(formState.payWay).toBe(5)
      // Left open it would show the card steps under the COD heading.
      expect(wrapper.text()).not.toContain('ασφαλές τραπεζικό περιβάλλον')
      expect(wrapper.text()).not.toContain('στον διανομέα')
    })

    it('renders no trigger for a method without instructions', async () => {
      const wrapper = await mount({ formState: reactive({ payWay: 7 }) })

      expect(trigger(wrapper)).toBeUndefined()
    })
  })

  it('emits back from the back button', async () => {
    const wrapper = await mount()

    await buttonByText(wrapper, 'Πίσω')!.trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('submits through the exposed submit() the sidebar CTA calls', async () => {
    const wrapper = await mount()

    await (wrapper.vm as unknown as { $: { exposed: { submit: () => Promise<void> } } }).$.exposed.submit()

    await vi.waitFor(() => expect(wrapper.emitted('submit')).toHaveLength(1))
  })
})
