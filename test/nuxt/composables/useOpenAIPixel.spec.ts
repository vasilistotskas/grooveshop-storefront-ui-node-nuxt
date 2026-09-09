/**
 * The ChatGPT Ads pixel drops anything it does not recognise, without
 * logging. That is how the first implementation shipped broken and
 * looked fine: it modelled OpenAI on Meta — `oaiq('track', 'Purchase',
 * { value, content_ids, num_items })` — and the SDK silently discarded
 * every event while the pixel itself initialised normally. Every
 * conversion since the pixel shipped was lost.
 *
 * So these pin the wire format against
 * https://developers.openai.com/ads/measurement-pixel, whose documented
 * ecommerce example is:
 *
 *     oaiq("measure", "order_created", {
 *       type: "contents",
 *       amount: 2599,
 *       currency: "USD",
 *       contents: [{ id: "sku_123", name: "Starter bundle",
 *                    content_type: "product", quantity: 1 }],
 *     })
 *
 * Nothing in the browser would trip on a wrong payload, so it has to be
 * trippable here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { useOpenAIPixel, toMinorUnits } = await import('~/composables/useOpenAIPixel')

function setTenantPixelId(id: string) {
  const tenantStore = useTenantStore()
  tenantStore.setConfig({
    ...(tenantStore.config ?? {}),
    openaiPixelId: id,
  } as TenantConfig)
}

function installOaiq() {
  const oaiq = vi.fn()
  ;(window as unknown as { oaiq?: unknown }).oaiq = oaiq
  return oaiq
}

describe('toMinorUnits', () => {
  it('converts a two-decimal currency', () => {
    expect(toMinorUnits(25.99, 'EUR')).toBe(2599)
  })

  it('rounds rather than truncating float noise', () => {
    // 19.99 * 100 is 1998.9999999999998 in IEEE 754.
    expect(toMinorUnits(19.99, 'EUR')).toBe(1999)
    expect(toMinorUnits(0.1 + 0.2, 'EUR')).toBe(30)
  })

  it('respects a zero-decimal currency', () => {
    // Hardcoding *100 would report 100x the revenue for JPY.
    expect(toMinorUnits(2599, 'JPY')).toBe(2599)
  })

  it('falls back to two decimals for an unusable code', () => {
    expect(toMinorUnits(10, 'not-a-currency')).toBe(1000)
  })
})

describe('useOpenAIPixel — wire format', () => {
  let oaiq: ReturnType<typeof installOaiq>

  beforeEach(() => {
    setActivePinia(createPinia())
    setTenantPixelId('8MktrqpXN1MRdD2NUfkXmU')
    oaiq = installOaiq()
  })

  it('uses the measure command, not track', () => {
    useOpenAIPixel().trackOrderCreated({ currency: 'EUR', amount: 1 })

    expect(oaiq).toHaveBeenCalledOnce()
    expect(oaiq.mock.calls[0]![0]).toBe('measure')
  })

  it('sends OpenAI event names, not Meta ones', () => {
    const pixel = useOpenAIPixel()
    pixel.trackContentsViewed()
    pixel.trackItemsAdded()
    pixel.trackCheckoutStarted()
    pixel.trackOrderCreated()

    expect(oaiq.mock.calls.map(c => c[1])).toEqual([
      'contents_viewed',
      'items_added',
      'checkout_started',
      'order_created',
    ])
  })

  it('matches the documented purchase payload exactly', () => {
    useOpenAIPixel().trackOrderCreated({
      amount: 25.99,
      currency: 'USD',
      contents: [
        { id: 'sku_123', name: 'Starter bundle', contentType: 'product', quantity: 1 },
      ],
    })

    expect(oaiq).toHaveBeenCalledWith('measure', 'order_created', {
      type: 'contents',
      amount: 2599,
      currency: 'USD',
      contents: [
        { id: 'sku_123', name: 'Starter bundle', content_type: 'product', quantity: 1 },
      ],
    })
  })

  it('sends money as an integer minor unit, never a decimal', () => {
    useOpenAIPixel().trackOrderCreated({ amount: 25.99, currency: 'EUR' })

    const payload = oaiq.mock.calls[0]![2] as Record<string, unknown>
    expect(payload.amount).toBe(2599)
    expect(Number.isInteger(payload.amount)).toBe(true)
  })

  it('omits amount when there is no currency to scale it by', () => {
    // Guessing an exponent would silently misreport the value.
    useOpenAIPixel().trackOrderCreated({ amount: 25.99 })

    const payload = oaiq.mock.calls[0]![2] as Record<string, unknown>
    expect(payload).not.toHaveProperty('amount')
  })

  it('omits type and contents when there are no line items', () => {
    useOpenAIPixel().trackCheckoutStarted({ currency: 'EUR', amount: 5 })

    const payload = oaiq.mock.calls[0]![2] as Record<string, unknown>
    expect(payload).not.toHaveProperty('contents')
    expect(payload).not.toHaveProperty('type')
  })

  it('drops content fields that were not provided', () => {
    // Sending `name: undefined` is not the same as omitting it.
    useOpenAIPixel().trackItemsAdded({
      currency: 'EUR',
      amount: 3,
      contents: [{ id: '7' }],
    })

    const payload = oaiq.mock.calls[0]![2] as { contents: object[] }
    expect(payload.contents[0]).toEqual({ id: '7' })
  })

  it('stays silent when the tenant has no pixel id', () => {
    setTenantPixelId('')

    const pixel = useOpenAIPixel()
    pixel.trackOrderCreated({ currency: 'EUR', amount: 1 })

    expect(pixel.isProvisioned).toBe(false)
    expect(oaiq).not.toHaveBeenCalled()
  })

  it('does not throw before consent injects the SDK', () => {
    // `window.oaiq` is genuinely absent until the consent trigger
    // fires; a call site must not have to guard for it.
    delete (window as unknown as { oaiq?: unknown }).oaiq

    expect(() =>
      useOpenAIPixel().trackOrderCreated({ currency: 'EUR', amount: 1 }),
    ).not.toThrow()
  })
})
