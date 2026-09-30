import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import StripePayment from '~/components/StripePayment.vue'
import { makeOrder } from '~~/test/fixtures/order'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The embedded Stripe card form: it loads Stripe.js through
 * `@nuxt/scripts` (`useScriptStripe().onLoaded(({ Stripe }) => …)`, per
 * the @nuxt/scripts Stripe docs), with the TENANT's publishable key,
 * creates the payment intent on Django once, and confirms the card —
 * including a 3-D Secure challenge — reporting the outcome upward.
 *
 * The SDK is mocked at that boundary: `Stripe(key)` returns a fake whose
 * card element records its `change` handler, so a test can play the
 * shopper typing a complete (or invalid) card.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const sdk = vi.hoisted(() => {
  const handlers: Record<string, (event: any) => void> = {}
  const card = {
    mount: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn((event: string, handler: (e: any) => void) => { handlers[event] = handler }),
  }
  const elements = { create: vi.fn((_type: string, _options?: unknown) => card) }
  const stripe = {
    elements: vi.fn((_options?: unknown) => elements),
    confirmCardPayment: vi.fn((_secret: string, _data?: unknown): Promise<any> => Promise.resolve({})),
    handleCardAction: vi.fn((_secret: string): Promise<any> => Promise.resolve({})),
  }
  const Stripe = vi.fn((_key: string): typeof stripe | null => stripe)
  return { handlers, card, elements, stripe, Stripe }
})

mockNuxtImport('$api', () => api)
mockNuxtImport('useScriptStripe', () => () => ({
  onLoaded: (callback: (api: { Stripe: typeof sdk.Stripe }) => void) => callback({ Stripe: sdk.Stripe }),
}))

const ORDER = makeOrder({ id: 7, firstName: 'Maria', lastName: 'Papadopoulou', email: 'maria@example.com', phone: '+306912345678' })
const INTENT = '/api/orders/7/create-payment-intent'
const PI = { id: 'pi_1', status: 'succeeded', amount: 4200, currency: 'eur' }

/** The component's own copy (its `<i18n>` block is not global). */
const COPY = {
  create: 'Δημιουργία Πληρωμής',
  confirm: 'Επιβεβαίωση Πληρωμής',
  initError: 'Αποτυχία αρχικοποίησης συστήματος πληρωμής',
  intentError: 'Αποτυχία δημιουργίας πρόθεσης πληρωμής',
  confirmError: 'Η επιβεβαίωση πληρωμής απέτυχε',
  threeDsFailed: 'Η επαλήθευση ταυτότητας 3D Secure απέτυχε',
  threeDsIncomplete: 'Η επαλήθευση ταυτότητας 3D Secure δεν ολοκληρώθηκε',
}

type Exposed = { createPaymentIntent: () => Promise<void>, confirmPayment: () => Promise<void> }

const button = (wrapper: VueWrapper, label: string) => wrapper.findAll('button').find(b => b.text() === label)
const typeCard = async (event: { complete: boolean, error?: { message: string } }) => {
  sdk.handlers.change!(event)
  await flushPromises()
}

describe('StripePayment', () => {
  beforeEach(() => {
    for (const key of Object.keys(sdk.handlers)) delete sdk.handlers[key]
    setTenant({ stripePublishableKey: 'pk_test_tenant' })
    api.routes({ [INTENT]: { clientSecret: 'pi_1_secret' } })
  })

  async function mount(props: Record<string, unknown> = {}) {
    const wrapper = await mountSuspended(StripePayment, {
      route: false,
      props: { order: ORDER, payWay: makePayWay({ providerCode: 'stripe', settlement: 'online' }), ...props },
    })
    await flushPromises()
    return wrapper
  }

  /** Card typed, intent created: the confirm button is on screen. */
  async function readyToConfirm() {
    const wrapper = await mount()
    await typeCard({ complete: true })
    await button(wrapper, COPY.create)!.trigger('click')
    await flushPromises()
    return wrapper
  }

  it('starts Stripe with the tenant key, mounts the card and says it is ready', async () => {
    const wrapper = await mount()

    expect(sdk.Stripe).toHaveBeenCalledWith('pk_test_tenant')
    expect(sdk.elements.create).toHaveBeenCalledWith('card', expect.any(Object))
    expect(sdk.card.mount).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('ready')).toHaveLength(1)
  })

  it('reports a Stripe that could not start', async () => {
    sdk.Stripe.mockReturnValue(null)

    const wrapper = await mount()

    expect(wrapper.text()).toContain(COPY.initError)
    expect(wrapper.emitted('ready')).toBeUndefined()
  })

  it('lets the shopper set up the payment only once the card is complete', async () => {
    const wrapper = await mount()
    expect(button(wrapper, COPY.create)!.attributes('disabled')).toBeDefined()

    await typeCard({ complete: true })

    expect(button(wrapper, COPY.create)!.attributes('disabled')).toBeUndefined()
  })

  it('shows what Stripe says is wrong with the card', async () => {
    const wrapper = await mount()

    await typeCard({ complete: false, error: { message: 'Ο αριθμός κάρτας δεν είναι έγκυρος.' } })

    expect(wrapper.text()).toContain('Ο αριθμός κάρτας δεν είναι έγκυρος.')
  })

  it('creates the payment intent for this order and hands the secret up', async () => {
    const wrapper = await readyToConfirm()

    expect(api.callsTo(INTENT)).toEqual([{
      url: INTENT,
      options: { method: 'POST', body: {}, query: { uuid: ORDER.uuid } },
    }])
    expect(wrapper.emitted('update:clientSecret')).toEqual([['pi_1_secret']])
    expect(button(wrapper, COPY.confirm)).toBeDefined()
  })

  it('creates one intent however often it is asked while the first is in flight', async () => {
    let answer: (value: unknown) => void = () => {}
    api.routes({ [INTENT]: () => new Promise((resolve) => { answer = resolve }) })
    const wrapper = await mount()
    const exposed = wrapper.vm as unknown as Exposed

    void exposed.createPaymentIntent()
    void exposed.createPaymentIntent()
    answer({ clientSecret: 'pi_1_secret' })
    await flushPromises()
    await exposed.createPaymentIntent()

    expect(api.callsTo(INTENT)).toHaveLength(1)
  })

  it('reuses a secret it was re-mounted with instead of creating an orphan intent', async () => {
    const wrapper = await mount({ initialClientSecret: 'pi_0_secret' })
    const exposed = wrapper.vm as unknown as Exposed
    sdk.stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: PI })

    await exposed.createPaymentIntent()
    await exposed.confirmPayment()

    expect(api.callsTo(INTENT)).toHaveLength(0)
    expect(sdk.stripe.confirmCardPayment).toHaveBeenCalledWith('pi_0_secret', expect.any(Object))
  })

  it.each([
    { case: 'no secret', answer: () => ({}), message: COPY.intentError },
    {
      case: 'a refusal with a detail',
      answer: () => { throw Object.assign(new Error('Bad Request'), { statusCode: 400, data: { detail: 'Η παραγγελία έχει ήδη πληρωθεί' } }) },
      message: 'Η παραγγελία έχει ήδη πληρωθεί',
    },
  ])('reports $case from the intent call and stays on the card step', async ({ answer, message }) => {
    api.routes({ [INTENT]: answer })

    const wrapper = await readyToConfirm()

    expect(wrapper.emitted('error')).toEqual([[message]])
    expect(wrapper.text()).toContain(message)
    expect(button(wrapper, COPY.confirm)).toBeUndefined()
  })

  it('confirms the card with the buyer\'s details and reports the paid intent', async () => {
    sdk.stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: PI })
    const wrapper = await readyToConfirm()

    await button(wrapper, COPY.confirm)!.trigger('click')
    await flushPromises()

    expect(sdk.stripe.confirmCardPayment).toHaveBeenCalledWith('pi_1_secret', {
      payment_method: {
        card: sdk.card,
        billing_details: { name: 'Maria Papadopoulou', email: 'maria@example.com', phone: '+306912345678' },
      },
    })
    expect(wrapper.emitted('success')).toEqual([[{ payment_id: 'pi_1', status: 'succeeded', amount: 4200, currency: 'eur' }]])
  })

  it.each([
    {
      case: 'a declined card',
      arrange: () => sdk.stripe.confirmCardPayment.mockResolvedValue({ error: { message: 'Η κάρτα απορρίφθηκε.' } }),
      message: 'Η κάρτα απορρίφθηκε.',
    },
    {
      case: 'a failed 3-D Secure challenge',
      arrange: () => {
        sdk.stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: { ...PI, status: 'requires_action' } })
        sdk.stripe.handleCardAction.mockResolvedValue({ error: { message: '' } })
      },
      message: COPY.threeDsFailed,
    },
    {
      case: 'an abandoned 3-D Secure challenge',
      arrange: () => {
        sdk.stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: { ...PI, status: 'requires_action' } })
        sdk.stripe.handleCardAction.mockResolvedValue({ paymentIntent: { ...PI, status: 'requires_payment_method' } })
      },
      message: COPY.threeDsIncomplete,
    },
    {
      case: 'a network failure',
      arrange: () => sdk.stripe.confirmCardPayment.mockRejectedValue(new Error('Failed to fetch')),
      message: COPY.confirmError,
    },
  ])('reports $case and does not report a payment', async ({ arrange, message }) => {
    arrange()
    const wrapper = await readyToConfirm()

    await button(wrapper, COPY.confirm)!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('error')).toEqual([[message]])
    expect(wrapper.emitted('success')).toBeUndefined()
  })

  it('reports the payment once the 3-D Secure challenge succeeds', async () => {
    sdk.stripe.confirmCardPayment.mockResolvedValue({ paymentIntent: { ...PI, status: 'requires_action' } })
    sdk.stripe.handleCardAction.mockResolvedValue({ paymentIntent: { ...PI, id: 'pi_1b' } })
    const wrapper = await readyToConfirm()

    await button(wrapper, COPY.confirm)!.trigger('click')
    await flushPromises()

    expect(sdk.stripe.handleCardAction).toHaveBeenCalledWith('pi_1_secret')
    expect(wrapper.emitted('success')).toEqual([[{ payment_id: 'pi_1b', status: 'succeeded', amount: 4200, currency: 'eur' }]])
  })

  it('tears the card element down when it leaves', async () => {
    const wrapper = await mount()

    wrapper.unmount()

    expect(sdk.card.destroy).toHaveBeenCalledTimes(1)
  })
})
