import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import StripeCheckout from '~/components/StripeCheckout.vue'
import { makeOrder } from '~~/test/fixtures/order'
import { makePayWay } from '~~/test/fixtures/payWay'

/**
 * Stripe Checkout: on mount the component asks Django for a hosted
 * checkout session and sends the browser to it. Stripe fills
 * `{CHECKOUT_SESSION_ID}` into the success URL itself, so the literal
 * placeholder is the contract. `window.location` is replaced for each
 * test: the redirect must be observed, not performed.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)

const ORIGIN = 'https://shop.test'
const ORDER_UUID = '00000000-0000-4006-8000-000000000005'

const ORDER = makeOrder({ id: 5, uuid: ORDER_UUID, email: 'maria@example.com' })

let location: { origin: string, href: string }

const SESSION = '/api/orders/5/create-checkout-session'

describe('StripeCheckout', () => {
  beforeEach(() => {
    location = { origin: ORIGIN, href: `${ORIGIN}/checkout` }
    vi.stubGlobal('location', location)
    api.routes({ [SESSION]: { checkoutUrl: 'https://checkout.stripe.test/c/pay/cs_1' } })
  })

  const mount = (props: Record<string, unknown> = {}) =>
    mountSuspended(StripeCheckout, { route: false, props: { order: ORDER, payWay: makePayWay({ providerCode: 'stripe', settlement: 'online' }), ...props } })

  const retry = (wrapper: VueWrapper) => wrapper.findAll('button').find(b => b.text() === 'Επανάληψη')

  it('creates a session that returns to this order and to a cancelled checkout', async () => {
    await mount()
    await flushPromises()

    expect(api.callsTo(SESSION)).toEqual([{
      url: SESSION,
      options: {
        method: 'POST',
        body: {
          successUrl: `${ORIGIN}/checkout/success/${ORDER_UUID}?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${ORIGIN}/checkout?canceled=true`,
          customerEmail: 'maria@example.com',
          description: 'Payment for Order #5',
        },
        query: { uuid: ORDER_UUID },
      },
    }])
  })

  it('announces the redirect, then sends the browser to the session', async () => {
    const hrefWhenAnnounced: string[] = []

    await mount({ onRedirecting: () => hrefWhenAnnounced.push(location.href) })
    await flushPromises()

    expect(hrefWhenAnnounced).toEqual([`${ORIGIN}/checkout`])
    expect(location.href).toBe('https://checkout.stripe.test/c/pay/cs_1')
  })

  it.each([
    { case: 'answers without a checkout URL', answer: () => ({}), message: 'Αποτυχία δημιουργίας συνεδρίας πληρωμής' },
    {
      case: 'refuses with a detail',
      answer: () => { throw Object.assign(new Error('Bad Request'), { statusCode: 400, data: { detail: 'Η παραγγελία έχει ήδη πληρωθεί' } }) },
      message: 'Η παραγγελία έχει ήδη πληρωθεί',
    },
    {
      case: 'fails without a detail',
      answer: () => { throw Object.assign(new Error('[POST] "/api/…": 502 Bad Gateway'), { statusCode: 502 }) },
      message: 'Αποτυχία δημιουργίας συνεδρίας πληρωμής',
    },
  ])('stays, reports and offers a retry when the server $case', async ({ answer, message }) => {
    api.routes({ [SESSION]: answer })

    const wrapper = await mount()
    await flushPromises()

    expect(wrapper.emitted('error')).toEqual([[message]])
    expect(wrapper.emitted('redirecting')).toBeUndefined()
    expect(location.href).toBe(`${ORIGIN}/checkout`)
    expect(wrapper.text()).toContain(message)
    expect(retry(wrapper)).toBeDefined()
  })

  it('tries again from the retry button', async () => {
    api.routes({ [SESSION]: () => ({}) })
    const wrapper = await mount()
    await flushPromises()
    api.routes({ [SESSION]: { checkoutUrl: 'https://checkout.stripe.test/c/pay/cs_2' } })

    await retry(wrapper)!.trigger('click')
    await flushPromises()

    expect(api.callsTo(SESSION)).toHaveLength(2)
    expect(location.href).toBe('https://checkout.stripe.test/c/pay/cs_2')
  })
})
