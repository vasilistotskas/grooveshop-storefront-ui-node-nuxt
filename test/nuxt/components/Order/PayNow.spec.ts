import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { OrderDetail } from '~~/shared/openapi/types.gen'
import OrderPayNow from '~/components/Order/PayNow.vue'
import payNowSource from '~/components/Order/PayNow.vue?raw'
import { makeOrder } from '~~/test/fixtures/order'
import { failWith } from '~~/test/helpers/api'
import { componentTexts } from '~~/test/helpers/componentTexts'

/** The component's own texts, as it formats them. */
const texts = componentTexts(payNowSource, 'PayNow.vue')

/**
 * «Pay now» on an order that waits for its online payment: until when it
 * can be paid, a new payment link for the same order from Django, the
 * browser sent to it, and a canceled payment back on the order's page.
 * Django's refusals that end the offer replace the button with why; any
 * other failure keeps it. `window.location` is replaced for each test: the
 * redirect is observed, not performed.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { session } = vi.hoisted(() => ({ session: { loggedIn: false } }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(session.loggedIn),
  user: ref(session.loggedIn ? { id: 7 } : null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const ORIGIN = 'https://shop.test'
const NOW = new Date('2026-11-20T10:00:00Z')
const DEADLINE = '2026-11-20T10:30:00.000Z'
const SESSION = '/api/orders/42/create-checkout-session'
const PROVIDER = 'https://demo.vivapayments.test/web/checkout?ref=1'
const LINK_EXPIRES = '2026-11-20T10:40:00.000Z'

/** A Viva order of 25€, its link payable for another half hour. */
function payable(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return makeOrder({
    id: 42,
    amountDue: 25,
    payWayKey: 'VIVA_WALLET',
    isOnlinePayment: true,
    isCollectedOnDelivery: false,
    paymentHoldExpiresAt: DEADLINE,
    ...overrides,
  })
}

let location: { origin: string, href: string }

const payButton = (wrapper: VueWrapper) => wrapper.findAll('button').find(b => b.text() === texts.t('pay'))

describe('OrderPayNow', () => {
  beforeEach(() => {
    session.loggedIn = false
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(NOW)
    location = { origin: ORIGIN, href: `${ORIGIN}/account/orders/42` }
    vi.stubGlobal('location', location)
    api.routes({ [SESSION]: { checkoutUrl: PROVIDER, expiresAt: LINK_EXPIRES } })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mount = (order: OrderDetail, props: Record<string, unknown> = {}) =>
    mountSuspended(OrderPayNow, { route: false, props: { order, ...props } })

  it('says what is due and until when, and pays from the button', async () => {
    const wrapper = await mount(payable())

    expect(wrapper.text()).toContain(texts.t('title'))
    expect(wrapper.text()).toContain('25,00')
    expect(wrapper.find('time').attributes('datetime')).toBe(DEADLINE)

    await payButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(location.href).toBe(PROVIDER)
  })

  it('moves the deadline this browser keeps for the order to the new link\'s', async () => {
    const order = payable()
    rememberAwaitingPaymentOrder(order.uuid, DEADLINE)
    const wrapper = await mount(order)

    await payButton(wrapper)!.trigger('click')
    await flushPromises()
    vi.setSystemTime(new Date('2026-11-20T10:35:00Z'))

    expect(readAwaitingPaymentOrder()).toBe(order.uuid)
  })

  it.each([
    { reader: 'a guest', loggedIn: false, user: null, page: '/checkout/success/' },
    { reader: 'the signed-in owner', loggedIn: true, user: 7, page: '/account/orders/42' },
    { reader: 'another signed-in shopper', loggedIn: true, user: 8, page: '/checkout/success/' },
  ])('asks for a link to the same order that returns $reader to the order\'s page', async ({ loggedIn, user, page }) => {
    session.loggedIn = loggedIn
    const order = payable({ user })
    const wrapper = await mount(order)

    await payButton(wrapper)!.trigger('click')
    await flushPromises()

    const expectedPage = page.endsWith('/') ? `${page}${order.uuid}` : page
    expect(api.callsTo(SESSION)).toEqual([{
      url: SESSION,
      options: {
        method: 'POST',
        body: {
          successUrl: `${ORIGIN}/checkout/success/${order.uuid}?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${ORIGIN}${expectedPage}`,
        },
        query: { uuid: order.uuid },
      },
    }])
  })

  it.each([
    { case: 'no hold (paid, closed or offline)', order: () => makeOrder({ id: 42 }) },
    { case: 'a charge waiting for the store\'s review', order: () => payable({ paymentAwaitsReview: true }) },
    { case: 'a payment the provider is processing', order: () => payable({ paymentStatus: 'PROCESSING' }) },
  ])('offers nothing for $case', async ({ order }) => {
    const wrapper = await mount(order())

    expect(wrapper.text()).toBe('')
  })

  it.each([
    { code: 'payment_window_expired' },
    { code: 'order_not_payable' },
  ])('replaces the button with the reason when Django refuses with $code', async ({ code }) => {
    api.routes({ [SESSION]: failWith(400, { detail: 'Django', code }) })
    const wrapper = await mount(payable())

    await payButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(texts.t('closed_title'))
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t(`errors.codes.${code}`))
    expect(payButton(wrapper)).toBeUndefined()
    expect(wrapper.emitted('closed')).toHaveLength(1)
    expect(location.href).toBe(`${ORIGIN}/account/orders/42`)
  })

  it('keeps the button, with the reason, for a failure that may pass', async () => {
    api.routes({ [SESSION]: failWith(502) })
    const wrapper = await mount(payable())

    await payButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(texts.t('error_title'))
    expect(wrapper.text()).toContain(texts.t('error_fallback'))
    expect(wrapper.emitted('closed')).toBeUndefined()

    api.routes({ [SESSION]: { checkoutUrl: PROVIDER, expiresAt: LINK_EXPIRES } })
    await payButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(location.href).toBe(PROVIDER)
  })

  it('says the time ran out for a deadline already past', async () => {
    const wrapper = await mount(payable({ paymentHoldExpiresAt: '2026-11-20T09:59:00Z' }))

    expect(wrapper.text()).toContain(texts.t('expired.title'))
    expect(payButton(wrapper)).toBeUndefined()
  })

  it('ends the offer when the deadline passes on the open page', async () => {
    const wrapper = await mount(payable())
    expect(payButton(wrapper)).toBeDefined()

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)

    expect(wrapper.text()).toContain(texts.t('expired.title'))
    expect(payButton(wrapper)).toBeUndefined()
    expect(wrapper.emitted('closed')).toHaveLength(1)
  })

  it('names the order and links to it as the cart\'s reminder', async () => {
    const order = payable()
    const wrapper = await mount(order, { reminder: true })

    expect(wrapper.text()).toContain(texts.t('reminder.title', { id: 42 }))
    const view = wrapper.findAll('a').find(a => a.text() === texts.t('reminder.view'))
    expect(view?.attributes('href')).toBe(`/checkout/success/${order.uuid}`)
  })
})
