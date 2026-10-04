import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import * as z from 'zod'
import StepPayment from '~/components/Checkout/StepPayment.vue'
import WebsideStepPayment from '~/components/variants/webside/Checkout/StepPayment.vue'
import { makePayWay } from '~~/test/fixtures/payWay'

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
 * The default tree was redesigned (radio cards, a Review card, a terms
 * gate); the frozen webside copy keeps the original body below, run on
 * its own, and the redesign has its own suite after it.
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

describe('Webside Checkout/StepPayment', () => {
  const C = WebsideStepPayment
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

/**
 * The redesigned step: one radio card per pay way, the Review card and
 * the terms consent. The page owns Back and Pay; it calls the exposed
 * `submit()`, which this step gates on the consent.
 */
const payWayOption = (overrides: Record<string, unknown> & { value: number }, payWay: Parameters<typeof makePayWay>[0] = {}) => {
  const fixture = makePayWay({ id: overrides.value, ...payWay })
  return {
    label: 'x',
    providerCode: fixture.providerCode,
    settlement: fixture.settlement,
    cost: 0,
    description: '',
    instructions: '',
    freeThresholdHint: '',
    ...overrides,
  }
}

const VIVA = payWayOption({ label: 'Κάρτα (Viva)', name: 'Κάρτα, Apple Pay ή Google Pay', value: 6, description: 'Επεξεργασία από τη Viva Wallet', instructions: CARD_INSTRUCTIONS }, { providerCode: 'viva_wallet', settlement: 'online' })
const STRIPE = payWayOption({ label: 'Κάρτα Stripe', name: 'Κάρτα μέσω Stripe', value: 8, description: 'Πληρωμή χωρίς έξοδο από τη σελίδα' }, { providerCode: 'stripe', settlement: 'online' })
const COD = payWayOption({
  label: 'Αντικαταβολή (+2,00 €)',
  name: 'Αντικαταβολή',
  value: 5,
  cost: 2,
  description: '<div>Πληρωμή σε μετρητά κατά την παράδοση</div>',
  instructions: COD_INSTRUCTIONS,
  freeThresholdHint: 'Δωρεάν για παραγγελίες άνω των 50,00 €',
}, { providerCode: 'cash_on_delivery', settlement: 'courier_cash' })
const TRANSFER = payWayOption({ label: 'Έμβασμα', name: 'Τραπεζικό έμβασμα', value: 7 }, { providerCode: 'bank_transfer', settlement: 'offline_transfer' })

const FORM = {
  payWay: 6,
  email: 'demo@grooveshop.space',
  phone: '+306900000000',
  firstName: 'Δήμος',
  lastName: 'Δοκιμής',
  shippingMethod: 'home_delivery',
  street: 'Τσιμισκή',
  streetNumber: '45',
  zipcode: '54622',
  city: 'Θεσσαλονίκη',
  documentType: 'RECEIPT',
}

describe('Checkout/StepPayment (redesign)', () => {
  const mountStep = async (overrides: Record<string, unknown> = {}, form: Record<string, unknown> = {}) => {
    const formState = reactive<Record<string, any>>({ ...FORM, ...form })
    const wrapper = await mountSuspended(StepPayment, {
      route: false,
      props: { formState, schema: z.object({ payWay: z.number().min(1) }), payWayOptions: [VIVA, STRIPE, COD, TRANSFER], isSubmitting: false, ...overrides },
    })
    return { wrapper, formState }
  }

  const submit = (wrapper: VueWrapper) =>
    (wrapper.vm as unknown as { $: { exposed: { submit: () => Promise<void> } } }).$.exposed.submit()
  const radios = (wrapper: VueWrapper) => wrapper.findAll('[role="radio"]')
  const card = (wrapper: VueWrapper, value: number) => wrapper.get(`[role="radio"][value="${value}"]`).element.closest('[data-slot="item"]') as HTMLElement
  const eur = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
  const acceptTerms = async (wrapper: VueWrapper) => {
    await wrapper.get('[role="checkbox"]').trigger('click')
    await flushPromises()
  }

  describe('payment method cards', () => {
    it('offers one radio per pay way, named without the surcharge suffix', async () => {
      const { wrapper } = await mountStep()

      expect(radios(wrapper)).toHaveLength(4)
      expect(wrapper.text()).toContain('Αντικαταβολή')
      expect(wrapper.text()).not.toContain('(+2,00 €)')
    })

    it('picking a card sets the pay way', async () => {
      const { wrapper, formState } = await mountStep()

      await wrapper.get('[role="radio"][value="5"]').trigger('click')
      await flushPromises()

      expect(formState.payWay).toBe(5)
    })

    it('shows the real surcharge on the pay way that charges one', async () => {
      const { wrapper } = await mountStep()

      expect(card(wrapper, 5).textContent).toContain(`+${eur(2)}`)
      expect(card(wrapper, 7).textContent).not.toContain('+')
    })

    it('shows card brands on the card methods only', async () => {
      const { wrapper } = await mountStep()

      expect(card(wrapper, 6).textContent).toContain('VISA')
      expect(card(wrapper, 8).textContent).toContain('MC')
      expect(card(wrapper, 5).textContent).not.toContain('VISA')
      expect(card(wrapper, 7).textContent).not.toContain('VISA')
    })

    it('renders the operator description as HTML, not escaped text', async () => {
      const { wrapper } = await mountStep()

      expect(wrapper.text()).toContain('Πληρωμή σε μετρητά κατά την παράδοση')
      expect(wrapper.html()).not.toContain('&lt;div&gt;')
    })

    it('says when the surcharge is waived above a threshold', async () => {
      const { wrapper } = await mountStep()

      expect(card(wrapper, 5).textContent).toContain('Δωρεάν για παραγγελίες άνω των 50,00 €')
    })

    it('strips scripts and event handlers from the operator HTML', async () => {
      const dirty = { ...COD, description: '<p>Ασφαλής πληρωμή</p><script>window.pwned = 1</script><img src="x" onerror="window.pwned = 1">' }
      const { wrapper } = await mountStep({ payWayOptions: [dirty] }, { payWay: 5 })

      expect(wrapper.text()).toContain('Ασφαλής πληρωμή')
      expect(wrapper.html()).not.toContain('<script')
      expect(wrapper.html()).not.toContain('onerror')
    })

    it('disables the choice while an order is being placed', async () => {
      const { wrapper } = await mountStep({ isSubmitting: true })

      expect(radios(wrapper).map(radio => radio.attributes('data-disabled') ?? radio.attributes('disabled'))).not.toContain(undefined)
    })
  })

  describe('what happens after paying', () => {
    it('says Viva finishes on its own secure page', async () => {
      const { wrapper } = await mountStep()

      expect(card(wrapper, 6).textContent).toContain('ασφαλή σελίδα της Viva Wallet')
    })

    it.each([
      [true, 'ασφαλή σελίδα της Stripe'],
      [false, 'χωρίς να φύγεις από τη σελίδα'],
    ])('describes Stripe for hosted checkout = %s', async (useHostedCheckout, line) => {
      const { wrapper } = await mountStep({ useHostedCheckout }, { payWay: 8 })

      expect(card(wrapper, 8).textContent).toContain(line)
    })

    it('says nothing extra for a method that settles with the courier', async () => {
      const { wrapper } = await mountStep({}, { payWay: 5 })

      expect(wrapper.text()).not.toContain('ασφαλή σελίδα')
    })

    it('says it on the chosen card only', async () => {
      const { wrapper } = await mountStep({}, { payWay: 6 })

      expect(card(wrapper, 8).textContent).not.toContain('ασφαλή σελίδα')
      expect(card(wrapper, 8).textContent).not.toContain('χωρίς να φύγεις από τη σελίδα')
    })
  })

  describe('instructions disclosure', () => {
    const trigger = (wrapper: VueWrapper) => buttonByText(wrapper, 'Οδηγίες πληρωμής')

    it('is collapsed by default and opens on demand', async () => {
      const { wrapper } = await mountStep({}, { payWay: 5 })
      expect(wrapper.text()).not.toContain('στον διανομέα')

      await trigger(wrapper)!.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('στον διανομέα')
    })

    it('collapses again when another method with instructions is picked', async () => {
      const { wrapper } = await mountStep({}, { payWay: 5 })
      await trigger(wrapper)!.trigger('click')
      await flushPromises()
      expect(wrapper.text()).toContain('στον διανομέα')

      await wrapper.get('[role="radio"][value="6"]').trigger('click')
      await flushPromises()

      // Left open it would show the card steps under the card's name.
      expect(wrapper.text()).not.toContain('στον διανομέα')
      expect(wrapper.text()).not.toContain('ασφαλές τραπεζικό περιβάλλον')
    })

    it('has no trigger for a method without instructions', async () => {
      const { wrapper } = await mountStep({}, { payWay: 7 })

      expect(trigger(wrapper)).toBeUndefined()
    })
  })

  describe('review', () => {
    it('reads back the contact, the delivery address and the receipt name', async () => {
      const { wrapper } = await mountStep()
      const review = wrapper.get('dl').text()

      expect(review).toContain('demo@grooveshop.space')
      expect(review).toContain('+306900000000')
      expect(review).toContain('Τσιμισκή 45, 54622 Θεσσαλονίκη')
      expect(review).toContain('Δήμος Δοκιμής')
    })
  })

  describe('submit(), the page\'s Pay button', () => {
    it('refuses until the terms are accepted: says why and emits nothing', async () => {
      const { wrapper } = await mountStep()

      await submit(wrapper)
      await flushPromises()

      expect(wrapper.emitted('submit')).toBeUndefined()
      expect(wrapper.get('[role="alert"]').text()).toContain('αποδέξου τους όρους χρήσης')
    })

    it('clears the message once the terms are accepted', async () => {
      const { wrapper } = await mountStep()
      await submit(wrapper)
      await flushPromises()

      await acceptTerms(wrapper)

      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('emits submit once the terms are accepted', async () => {
      const { wrapper } = await mountStep()
      await acceptTerms(wrapper)

      await submit(wrapper)

      await vi.waitFor(() => expect(wrapper.emitted('submit')).toHaveLength(1))
    })

    it('still validates the pay way once the terms are accepted', async () => {
      const { wrapper } = await mountStep({}, { payWay: undefined })
      await acceptTerms(wrapper)

      await submit(wrapper)
      await flushPromises()

      expect(wrapper.emitted('submit')).toBeUndefined()
    })

    it('does nothing while an order is already being placed', async () => {
      const { wrapper } = await mountStep({ isSubmitting: true })
      await acceptTerms(wrapper)

      await submit(wrapper)
      await flushPromises()

      expect(wrapper.emitted('submit')).toBeUndefined()
    })
  })

  it('leaves Back and Pay to the page', async () => {
    const { wrapper } = await mountStep()

    expect(buttonByText(wrapper, 'Πίσω')).toBeUndefined()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
  })
})
