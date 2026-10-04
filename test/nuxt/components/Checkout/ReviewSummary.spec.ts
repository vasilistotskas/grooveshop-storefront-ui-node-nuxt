import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ReviewSummary from '~/components/Checkout/ReviewSummary.vue'

/**
 * What steps 1 and 2 chose, read back before paying: the contact, where
 * the order goes (an address, or the locker picked) and the document the
 * shopper gets. It reads `formState` and changes nothing.
 */
const BASE = {
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

const mountReview = (form: Record<string, unknown> = {}) =>
  mountSuspended(ReviewSummary, { route: false, props: { formState: { ...BASE, ...form } } })

/** The delivery-step label the page shows for a method (global copy). */
const method = (key: string) => useNuxtApp().$i18n.t(`shipping.method.${key}.label`)

/** Each block as its heading and the lines under it. */
const blocks = (wrapper: VueWrapper) => wrapper.findAll('dl > div').map(block => [
  block.get('dt').text(),
  ...block.findAll('dd').map(line => line.text()),
])

describe('Checkout/ReviewSummary', () => {
  it('reads back the contact, a courier delivery and the receipt name', async () => {
    const wrapper = await mountReview()

    expect(blocks(wrapper)).toEqual([
      ['Επικοινωνία', 'demo@grooveshop.space', '+306900000000'],
      ['Παράδοση', method('home_delivery'), 'Τσιμισκή 45, 54622 Θεσσαλονίκη'],
      ['Απόδειξη', 'Δήμος Δοκιμής'],
    ])
  })

  it('names the BOX NOW locker picked, not the home address', async () => {
    const wrapper = await mountReview({
      shippingMethod: 'box_now_locker',
      boxnowLocker: { boxnowLockerId: '4', boxnowLockerName: 'BOX NOW Καμάρα', boxnowLockerAddressLine1: 'Εγνατία 10' },
    })

    expect(blocks(wrapper)[1]).toEqual(['Παράδοση', method('boxnow'), 'BOX NOW Καμάρα · Εγνατία 10'])
  })

  it('names the ACS Smartpoint picked', async () => {
    const wrapper = await mountReview({
      shippingMethod: 'acs_smartpoint',
      acsStation: { name: 'ACS Smartpoint Άνω Πόλη', addressLine1: 'Ολυμπιάδος 3' },
    })

    expect(blocks(wrapper)[1]).toEqual(['Παράδοση', method('acs_smartpoint'), 'ACS Smartpoint Άνω Πόλη · Ολυμπιάδος 3'])
  })

  it('shows the company and VAT number for an invoice', async () => {
    const wrapper = await mountReview({ documentType: 'INVOICE', billingCompanyName: 'Groove Office ΙΚΕ', billingVatId: '801234567' })

    expect(blocks(wrapper)[2]).toEqual(['Τιμολόγιο', 'Groove Office ΙΚΕ · ΑΦΜ 801234567'])
  })

  it('leaves out a contact detail the shopper did not give', async () => {
    const wrapper = await mountReview({ phone: '' })

    expect(blocks(wrapper)[0]).toEqual(['Επικοινωνία', 'demo@grooveshop.space'])
  })
})
