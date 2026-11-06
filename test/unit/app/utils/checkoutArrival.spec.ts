import { describe, it, expect } from 'vitest'
import { checkoutSuccessLocation, readCheckoutArrival } from '../../../../app/utils/checkoutArrival'

describe('the checkout arrival', () => {
  it('leaves the order id out of the address', () => {
    const location = checkoutSuccessLocation('/en/checkout/success', { orderUuid: 'secret', placed: true })

    expect(location.path).toBe('/en/checkout/success')
    expect(JSON.stringify({ path: location.path })).not.toContain('secret')
  })

  it('reads back what the location carries, as the history stores it', () => {
    const arrival = { orderUuid: 'u', sessionId: 's', vivaOrderCode: 'v', placed: true }
    const { state } = checkoutSuccessLocation('/checkout/success', arrival)

    expect(readCheckoutArrival(JSON.parse(JSON.stringify(state)))).toEqual(arrival)
  })

  it.each([
    ['no state', null],
    ['the router\'s own state', { back: '/', current: '/checkout/success' }],
    ['an empty order id', { checkoutArrival: { orderUuid: '' } }],
    ['no order id', { checkoutArrival: { placed: true } }],
  ])('finds no arrival in %s', (_label, state) => {
    expect(readCheckoutArrival(state)).toBeUndefined()
  })
})
