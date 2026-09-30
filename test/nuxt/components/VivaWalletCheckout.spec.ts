import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import VivaWalletCheckout from '~/components/VivaWalletCheckout.vue'
import { makeOrder } from '~~/test/fixtures/order'
import { makePayWay } from '~~/test/fixtures/payWay'
import { failWith } from '~~/test/helpers/api'

/**
 * Viva Wallet Smart Checkout: once mounted, the component asks Django
 * for a payment order and sends the browser to Viva's page. Viva
 * redirects to the URL configured in its merchant portal, so the URLs
 * sent here only satisfy Django's serializer — but they still name this
 * order and a cancelled checkout. `window.location` is replaced for
 * each test: the redirect must be observed, not performed.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)

const ORIGIN = 'https://shop.test'
const ORDER_UUID = '00000000-0000-4006-8000-000000000005'

const ORDER = makeOrder({ id: 5, uuid: ORDER_UUID, email: 'maria@example.com' })

let location: { origin: string, href: string }

const SESSION = '/api/orders/5/create-checkout-session'

describe('VivaWalletCheckout', () => {
  beforeEach(() => {
    location = { origin: ORIGIN, href: `${ORIGIN}/checkout` }
    vi.stubGlobal('location', location)
    api.routes({ [SESSION]: { checkoutUrl: 'https://demo.vivapayments.test/web/checkout?ref=1' } })
  })

  const mount = (props: Record<string, unknown> = {}) =>
    mountSuspended(VivaWalletCheckout, { route: false, props: { order: ORDER, payWay: makePayWay({ providerCode: 'viva_wallet', settlement: 'online' }), ...props } })

  const retry = (wrapper: VueWrapper) => wrapper.findAll('button').find(b => b.text() === 'Επανάληψη')

  it('creates one payment order naming this order and a cancelled checkout', async () => {
    await mount()
    await flushPromises()

    expect(api.callsTo(SESSION)).toEqual([{
      url: SESSION,
      options: {
        method: 'POST',
        body: {
          successUrl: `${ORIGIN}/checkout/success/${ORDER_UUID}`,
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
    expect(location.href).toBe('https://demo.vivapayments.test/web/checkout?ref=1')
  })

  it.each([
    { case: 'answers without a checkout URL', answer: () => ({}), message: 'Αποτυχία δημιουργίας συνεδρίας πληρωμής' },
    {
      case: 'refuses with a detail',
      answer: failWith(400, { detail: 'Η παραγγελία έχει ήδη πληρωθεί' }),
      message: 'Η παραγγελία έχει ήδη πληρωθεί',
    },
    {
      case: 'fails without a detail',
      answer: failWith(502),
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
    api.routes({ [SESSION]: { checkoutUrl: 'https://demo.vivapayments.test/web/checkout?ref=2' } })

    await retry(wrapper)!.trigger('click')
    await flushPromises()

    expect(api.callsTo(SESSION)).toHaveLength(2)
    expect(location.href).toBe('https://demo.vivapayments.test/web/checkout?ref=2')
  })
})
