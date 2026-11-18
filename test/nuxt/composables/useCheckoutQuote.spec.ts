/**
 * useCheckoutQuote: the checkout's one total, Django's quote of the order
 * the form would place. What is asked, when it is asked again, and what
 * a submit gets from `current()`.
 *
 * The quote goes through `useLazyApi`, so `$fetch` is the api mock too.
 * The composable runs outside a component, in an effect scope stopped
 * after each test, so no earlier instance keeps reacting to the cart.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, ref } from 'vue'
import type { EffectScope } from 'vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeCartQuote } from '~~/test/fixtures/checkoutQuote'
import { failWith } from '~~/test/helpers/api'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const QUOTE = makeCartQuote()

let scope: EffectScope | undefined

function setup(initial: CartQuoteRequestRequest = { countryId: 'GR' }) {
  const request = ref<CartQuoteRequestRequest>(initial)
  const cartVersion = ref('v1')
  scope = effectScope()
  const quote = scope.run(() => useCheckoutQuote({ request, cartVersion }))!
  return { request, cartVersion, ...quote }
}

const quoteCalls = () => api.callsTo('/api/cart/quote')

beforeEach(() => {
  clearNuxtData('checkout-quote')
  useCartStore().cart = makeCart()
  api.routes({ '/api/cart/quote': QUOTE })
})

afterEach(() => {
  scope?.stop()
  scope = undefined
})

describe('useCheckoutQuote', () => {
  it('asks Django for the quote of the request and shows its answer', async () => {
    const { quote } = setup({ countryId: 'GR', payWayId: 1 })
    await flushPromises()

    expect(quoteCalls()).toHaveLength(1)
    expect(quoteCalls()[0]!.options).toMatchObject({ method: 'POST', body: { countryId: 'GR', payWayId: 1 } })
    expect(quote.value).toEqual(QUOTE)
  })

  it('asks again when what it prices changes, never for the same request rebuilt', async () => {
    const { request } = setup({ countryId: 'GR' })
    await flushPromises()

    request.value = { countryId: 'GR' }
    await flushPromises()
    expect(quoteCalls()).toHaveLength(1)

    request.value = { countryId: 'GR', payWayId: 2 }
    await flushPromises()
    expect(quoteCalls()).toHaveLength(2)
    expect(quoteCalls()[1]!.options.body).toEqual({ countryId: 'GR', payWayId: 2 })
  })

  it('asks again when the cart changes what it costs', async () => {
    const { cartVersion } = setup()
    await flushPromises()

    cartVersion.value = 'v2'
    await flushPromises()

    expect(quoteCalls()).toHaveLength(2)
  })

  it('asks nothing for a cart without lines, which Django would refuse', async () => {
    useCartStore().cart = makeCart({ items: [] })

    const { quote } = setup()
    await flushPromises()

    expect(quoteCalls()).toEqual([])
    expect(quote.value).toBeNull()
  })

  it('shows no quote while Django refuses one, and current() hands back the refusal', async () => {
    const refusal = { detail: 'Δεν γίνεται αποστολή.', reason: 'shipping_unavailable', code: 'shipping_unavailable' }
    api.routes({ '/api/cart/quote': failWith(400, refusal) })

    const { quote, current } = setup()
    await flushPromises()

    expect(quote.value).toBeNull()
    const { quote: priced, error } = await current()
    expect(priced).toBeNull()
    expect(apiErrorBodyOf(error)).toEqual(refusal)
  })

  it('makes current() wait for the answer to a change made just before it', async () => {
    const { request, current } = setup({ countryId: 'GR' })
    await flushPromises()
    const answers: Array<(value: unknown) => void> = []
    api.routes({ '/api/cart/quote': () => new Promise(resolve => answers.push(resolve)) })

    request.value = { countryId: 'GR', payWayId: 2 }
    const settled = current()
    await nextTick()
    await vi.waitFor(() => expect(answers).toHaveLength(1))
    const changed = makeCartQuote({ amountDue: 70, expectedTotal: { amount: 7000, currency: 'EUR' } })
    answers[0]!(changed)

    expect(await settled).toEqual({ quote: changed, error: null })
  })
})
