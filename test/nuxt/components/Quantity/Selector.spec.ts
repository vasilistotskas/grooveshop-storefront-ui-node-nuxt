import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import QuantitySelector from '~/components/Quantity/Selector.vue'
import WebsideQuantitySelector from '~/components/variants/webside/Quantity/Selector.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { trees } from '~~/test/helpers/trees'

/**
 * The cart stepper mirrors clicks at once and persists them in ONE
 * debounced write (400 ms after the last change), strictly serialised,
 * reverting to the cart's own value when the write fails. The two trees
 * share the file byte for byte.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const toast = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn(), update: vi.fn(), clear: vi.fn() }))

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => toast)

const DEBOUNCE_MS = 400

/** What Django holds: a PUT moves it, `/api/cart` reports it. */
let serverQuantity = 2

const cartWith = (quantity: number) =>
  makeCart({ items: [{ id: 1, quantity, product: { stock: 5 } }] })

const putsTo = () => api.callsTo('/api/cart/items/1').filter(call => call.options?.method === 'PUT')

describe.each(trees(QuantitySelector, WebsideQuantitySelector))('$tree Quantity/Selector', ({ C }) => {
  beforeEach(() => {
    serverQuantity = 2
    useCartStore().cart = cartWith(serverQuantity)
    api.routes({
      '/api/cart': () => cartWith(serverQuantity),
      '/api/cart/items/1': (_url: string, options: any) => {
        serverQuantity = options.body.quantity
        return {}
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function mountStepper() {
    const wrapper = await mountSuspended(C, { route: false, props: { max: 5, cartItemId: 1 } })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const input = wrapper.findComponent({ name: 'UInputNumber' })
    const spinbutton = () => wrapper.find('[role="spinbutton"]')
    return { wrapper, input, spinbutton }
  }

  it('shows the line quantity and caps the stepper at the stock it was given', async () => {
    const { spinbutton } = await mountStepper()

    expect(spinbutton().attributes('aria-valuenow')).toBe('2')
    expect(spinbutton().attributes('aria-valuemax')).toBe('5')
  })

  it('coalesces rapid changes into one write of the last value', async () => {
    const { input } = await mountStepper()

    await input.setValue(3)
    await input.setValue(4)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
    expect(putsTo()).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(putsTo()).toEqual([
      { url: '/api/cart/items/1', options: expect.objectContaining({ method: 'PUT', body: { quantity: 4 } }) },
    ])
  })

  it('still writes while the shopper keeps changing it, at most 2 s after the first change', async () => {
    // Changes 300 ms apart never leave the 400 ms debounce quiet, so only
    // `maxWait` forces a write — at 2000 ms, with the value held then.
    const { input } = await mountStepper()

    for (let i = 0; i < 7; i++) {
      await input.setValue(i % 2 === 0 ? 3 : 4)
      await vi.advanceTimersByTimeAsync(300)
    }
    await flushPromises()

    expect(putsTo()).toEqual([
      { url: '/api/cart/items/1', options: expect.objectContaining({ method: 'PUT', body: { quantity: 3 } }) },
    ])
  })

  it.each([
    { case: 'changed and set back to what the cart holds', values: [3, 2] },
    { case: 'above the stock', values: [6] },
    { case: 'below one', values: [0] },
  ])('writes nothing for a value $case', async ({ values }) => {
    const { input } = await mountStepper()

    for (const value of values) await input.setValue(value)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    await flushPromises()

    expect(putsTo()).toHaveLength(0)
  })

  it('goes back to the cart quantity and says why when the write is refused', async () => {
    api.routes({
      '/api/cart': () => cartWith(serverQuantity),
      '/api/cart/items/1': () => {
        throw Object.assign(new Error('Bad Request'), {
          statusCode: 400,
          data: { nonFieldErrors: ['Διαθέσιμα μόνο 3 τεμάχια'] },
        })
      },
    })
    const { input, spinbutton } = await mountStepper()

    await input.setValue(4)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    await flushPromises()

    expect(spinbutton().attributes('aria-valuenow')).toBe('2')
    expect(toast.add).toHaveBeenCalledWith({ title: 'Διαθέσιμα μόνο 3 τεμάχια', color: 'error' })
  })

  it('never has two writes in flight, and sends the newest value once the first lands', async () => {
    let land: () => void = () => {}
    api.routes({
      '/api/cart': () => cartWith(serverQuantity),
      '/api/cart/items/1': (_url: string, options: any) => new Promise((resolve) => {
        land = () => {
          serverQuantity = options.body.quantity
          resolve({})
        }
      }),
    })
    const { input } = await mountStepper()

    await input.setValue(3)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    await input.setValue(5)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    await flushPromises()

    expect(putsTo().map(call => call.options.body)).toEqual([{ quantity: 3 }])

    land()
    await flushPromises()

    expect(putsTo().map(call => call.options.body)).toEqual([{ quantity: 3 }, { quantity: 5 }])
  })

  it('follows the cart when another tab changes the line', async () => {
    const { spinbutton } = await mountStepper()

    useCartStore().cart = cartWith(4)
    await flushPromises()

    expect(spinbutton().attributes('aria-valuenow')).toBe('4')
  })
})
