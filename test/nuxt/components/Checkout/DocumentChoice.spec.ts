import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import DocumentChoice from '~/components/Checkout/DocumentChoice.vue'
import WebsideDocumentChoice from '~/components/variants/webside/Checkout/DocumentChoice.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * Receipt or invoice, on the delivery step. An invoice may go to the
 * delivery address only for a home delivery: a pickup point is no
 * company's address, so a pickup invoice names its own (Django refuses
 * one without, #767). The step mounts this only on a store that issues
 * invoices (`b2bInvoicing`).
 */

// The bootstrap plugin chain calls useUserSession too, so the mock
// carries its whole surface.
const session = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { loggedIn: ref(false), user: ref<unknown>(null), session: ref({}), ready: ref(true) }
})
mockNuxtImport('useUserSession', () => () => ({
  ...session,
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const t = (key: string, params: Record<string, unknown> = {}): string => useNuxtApp().$i18n.t(key, params)

/** A checkbox by its visible label (UCheckbox: `<label for>` → `role="checkbox"` button). */
function checkbox(wrapper: VueWrapper, label: string) {
  const labelEl = wrapper.findAll('label').find(l => l.text() === label)
  if (!labelEl) throw new Error(`no checkbox "${label}"`)
  return wrapper.find(`[role="checkbox"][id="${labelEl.attributes('for')}"]`)
}

function hasField(wrapper: VueWrapper, name: string): boolean {
  return wrapper.find(`[name="${name}"]`).exists()
}

function makeFormState(overrides: Record<string, unknown> = {}) {
  return reactive<Record<string, any>>({
    shippingMethod: 'home_delivery',
    documentType: 'RECEIPT',
    billingSameAsShipping: true,
    ...overrides,
  })
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return { formState: makeFormState(), ...overrides }
}

/** The billing fields an INVOICE collects. */
const BILLING = {
  billingVatId: '123456789',
  billingCountry: 'GR',
  billingCompanyName: 'Groove Α.Ε.',
  billingTaxOffice: 'Α Αθηνών',
  billingActivity: 'Λιανικό εμπόριο',
  billingSameAsShipping: false,
  billingStreet: 'Σταδίου',
  billingStreetNumber: '10',
  billingCity: 'Αθήνα',
  billingZipcode: '10564',
}

describe.each(trees(DocumentChoice, WebsideDocumentChoice))('$tree Checkout/DocumentChoice', ({ tree, C }) => {
  beforeEach(() => {
    session.loggedIn.value = false
  })

  const mount = (overrides: Record<string, unknown> = {}) =>
    mountSuspended(C, { route: false, props: makeProps(overrides) })

  describe('receipt or invoice cards (default tree)', () => {
    /** The radio card whose label starts with `label`; the component's own copy, which the app-level `t` cannot see. */
    const card = (wrapper: VueWrapper, label: string) => {
      const group = wrapper.get('[role="radiogroup"]')
      const index = group.findAll('[data-slot="label"]').findIndex(l => l.text() === label)
      return group.findAll('[role="radio"]')[index]!
    }
    const cards = (wrapper: VueWrapper) => wrapper.findAll('[role="radio"]').map(radio => radio.attributes('aria-checked'))

    it.runIf(tree === 'default')('offers a receipt, which is picked, and an invoice, with what each is for', async () => {
      const wrapper = await mount()

      expect(wrapper.text()).toContain('Για προσωπικές αγορές')
      expect(wrapper.text()).toContain('Για επιχειρήσεις')
      expect(card(wrapper, 'Απόδειξη').attributes('aria-checked')).toBe('true')
      expect(card(wrapper, 'Τιμολόγιο').attributes('aria-checked')).toBe('false')
      expect(cards(wrapper)).toHaveLength(2)
    })

    it.runIf(tree === 'default')('asks for the company details once the shopper picks the invoice', async () => {
      const formState = makeFormState()
      const wrapper = await mount({ formState })
      expect(hasField(wrapper, 'billingVatId')).toBe(false)

      await card(wrapper, 'Τιμολόγιο').trigger('click')

      expect(formState.documentType).toBe('INVOICE')
      for (const name of ['billingCompanyName', 'billingVatId', 'billingTaxOffice', 'billingActivity']) {
        expect(hasField(wrapper, name)).toBe(true)
      }
    })

    it.runIf(tree === 'default')('asks for a billing address only when it differs from the delivery one', async () => {
      const formState = makeFormState({ documentType: 'INVOICE', billingSameAsShipping: true })
      const wrapper = await mount({ formState })
      expect(hasField(wrapper, 'billingStreet')).toBe(false)

      await checkbox(wrapper, t('form.invoice.billing_same_label')).trigger('click')

      expect(formState.billingSameAsShipping).toBe(false)
      expect(hasField(wrapper, 'billingStreet')).toBe(true)
    })

    it.runIf(tree === 'default')('wipes every billing field when the shopper goes back to a receipt', async () => {
      const formState = makeFormState({ documentType: 'INVOICE', ...BILLING })
      const wrapper = await mount({ formState })

      await card(wrapper, 'Απόδειξη').trigger('click')

      expect(formState).toMatchObject({
        documentType: 'RECEIPT',
        billingVatId: '',
        billingCountry: '',
        billingCompanyName: '',
        billingTaxOffice: '',
        billingActivity: '',
        billingSameAsShipping: true,
        billingStreet: '',
        billingStreetNumber: '',
        billingCity: '',
        billingZipcode: '',
      })
    })

    it.runIf(tree === 'webside')('wipes every billing field when the shopper turns the invoice off', async () => {
      const formState = makeFormState({ documentType: 'INVOICE', ...BILLING })
      const wrapper = await mount({ formState })

      await checkbox(wrapper, t('form.invoice.toggle_label')).trigger('click')

      expect(formState).toMatchObject({
        documentType: 'RECEIPT',
        billingVatId: '',
        billingCountry: '',
        billingCompanyName: '',
        billingTaxOffice: '',
        billingActivity: '',
        billingSameAsShipping: true,
        billingStreet: '',
        billingStreetNumber: '',
        billingCity: '',
        billingZipcode: '',
      })
    })
  })

  describe.runIf(tree === 'webside')('invoice (Τιμολόγιο) instead of a receipt', () => {
    const invoiceLabel = () => t('form.invoice.toggle_label')

    it('asks for the company details once the shopper ticks the invoice box', async () => {
      const formState = makeFormState()
      const wrapper = await mount({ formState })
      expect(hasField(wrapper, 'billingVatId')).toBe(false)

      await checkbox(wrapper, invoiceLabel()).trigger('click')

      expect(formState.documentType).toBe('INVOICE')
      for (const name of ['billingCompanyName', 'billingVatId', 'billingTaxOffice', 'billingActivity']) {
        expect(hasField(wrapper, name)).toBe(true)
      }
    })

    it('asks for a billing address only when it differs from the delivery one', async () => {
      const formState = makeFormState({ documentType: 'INVOICE', billingSameAsShipping: true })
      const wrapper = await mount({ formState })
      expect(hasField(wrapper, 'billingStreet')).toBe(false)

      await checkbox(wrapper, t('form.invoice.billing_same_label')).trigger('click')

      expect(formState.billingSameAsShipping).toBe(false)
      expect(hasField(wrapper, 'billingStreet')).toBe(true)
    })

    it('wipes every billing field when the shopper goes back to a receipt', async () => {
      // A VAT id left behind would still reach Django and myDATA would
      // issue an invoice (type 1.1) to a company the shopper un-picked.
      const formState = makeFormState({ documentType: 'INVOICE', ...BILLING })
      const wrapper = await mount({ formState })

      await checkbox(wrapper, invoiceLabel()).trigger('click')

      expect(formState).toMatchObject({
        documentType: 'RECEIPT',
        billingVatId: '',
        billingCountry: '',
        billingCompanyName: '',
        billingTaxOffice: '',
        billingActivity: '',
        billingSameAsShipping: true,
        billingStreet: '',
        billingStreetNumber: '',
        billingCity: '',
        billingZipcode: '',
      })
    })
  })

  // #767: a pickup order goes to the point, which is no company's address.
  describe('an invoice for a pickup order', () => {
    it.each(['box_now_locker', 'acs_smartpoint'])('asks a %s invoice for the company\'s address, with no "same as delivery"', async (shippingMethod) => {
      const wrapper = await mount({ formState: makeFormState({ shippingMethod, documentType: 'INVOICE', billingSameAsShipping: true }) })

      expect(wrapper.text()).not.toContain(t('form.invoice.billing_same_label'))
      for (const name of ['billingStreet', 'billingStreetNumber', 'billingCity', 'billingZipcode']) {
        expect(hasField(wrapper, name), name).toBe(true)
      }
    })
  })
})
