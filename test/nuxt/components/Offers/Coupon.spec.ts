import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OffersCoupon from '~/components/Offers/Coupon.vue'
import { makePromotion } from '~~/test/fixtures/promotion'

const mountCoupon = (offer = makePromotion(), clipboardSupported = true) =>
  mountSuspended(OffersCoupon, { route: false, props: { offer, clipboardSupported } })

/**
 * One offer as a coupon on the homepage's offers band: what you save,
 * on what terms, and the code to take to checkout.
 */
describe('OffersCoupon', () => {
  it('leads with what you save, then the offer and its terms', async () => {
    const wrapper = await mountCoupon(makePromotion({ maxDiscountAmount: 15, firstOrderOnly: true }))

    const [figure, terms] = wrapper.findAll('p').map(p => p.text())
    expect(figure).toBe('10%')
    expect(wrapper.find('h3').text()).toBe('Καλωσόρισμα 10%')
    expect(terms).toBe(`Μέγιστη έκπτωση 15,00\u00A0€ · Μόνο για την πρώτη σου παραγγελία`)
  })

  it('says a benefit that is not a number in words', async () => {
    const wrapper = await mountCoupon(makePromotion({ benefitType: 'FREE_SHIPPING' }))

    expect(wrapper.find('p').text()).toBe('Δωρεάν αποστολή')
  })

  it('hands its code up in one tap', async () => {
    const wrapper = await mountCoupon()

    expect(wrapper.find('code').text()).toBe('WELCOME10')
    const copy = wrapper.get('button[aria-label="Αντιγραφή κωδικού"]')
    expect(copy.text()).toBe('Αντιγραφή')
    await copy.trigger('click')

    expect(wrapper.emitted('copy')).toEqual([['WELCOME10']])
  })

  it('offers no copy button where the browser cannot copy', async () => {
    const wrapper = await mountCoupon(makePromotion(), false)

    expect(wrapper.find('code').text()).toBe('WELCOME10')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('says an automatic offer needs no code, rather than leaving the slot empty', async () => {
    const wrapper = await mountCoupon(makePromotion({ trigger: 'AUTOMATIC', code: null }))

    expect(wrapper.find('code').exists()).toBe(false)
    expect(wrapper.text()).toContain('Εφαρμόζεται αυτόματα στο καλάθι')
  })
})
