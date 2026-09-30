/**
 * Browser+server events (InitiateCheckout, Purchase) are posted twice —
 * by this pixel and by Django's Conversions API — and Meta collapses the
 * pair only when both carry the same `eventID`. So an id the caller
 * passes must reach `fbq` untouched and come back to the caller, and a
 * browser-only event must still get an id of its own.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

const { fbq, scriptMetaPixel } = vi.hoisted(() => {
  const fbq = vi.fn()
  return { fbq, scriptMetaPixel: vi.fn(() => ({ proxy: { fbq } })) }
})
mockNuxtImport('useScriptMetaPixel', () => scriptMetaPixel)

describe('useMetaPixel', () => {
  beforeEach(() => {
    setTenant({ metaPixelId: 'PIXEL_1' })
  })

  it('sends the caller\'s event id to the pixel and hands the same id back', () => {
    const { trackPurchase } = useMetaPixel()

    const returned = trackPurchase({ value: 10, currency: 'EUR' }, { eventID: 'order-evt-1' })

    expect(returned).toBe('order-evt-1')
    expect(fbq).toHaveBeenCalledWith('track', 'Purchase', { value: 10, currency: 'EUR' }, { eventID: 'order-evt-1' })
  })

  it('mints a dashless UUID for an event the caller did not give an id', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-2222-4333-8444-555555555555')
    const { trackAddToCart } = useMetaPixel()

    const returned = trackAddToCart({ contentIds: ['7'] })

    expect(returned).toBe('11111111222243338444555555555555')
    expect(fbq).toHaveBeenCalledWith('track', 'AddToCart', { content_ids: ['7'] }, { eventID: returned })
  })

  it('does nothing and returns no id when the store has no pixel', () => {
    setTenant({ metaPixelId: '' })
    const { isProvisioned, trackPurchase } = useMetaPixel()

    expect(isProvisioned).toBe(false)
    expect(trackPurchase({ value: 10 }, { eventID: 'order-evt-1' })).toBeUndefined()
    expect(scriptMetaPixel).not.toHaveBeenCalled()
    expect(fbq).not.toHaveBeenCalled()
  })

  it('registers the store\'s own pixel behind a manual trigger so only consent can load it', () => {
    useMetaPixel()

    expect(scriptMetaPixel).toHaveBeenCalledWith({
      id: 'PIXEL_1',
      scriptOptions: { trigger: 'manual', bundle: false },
    })
  })
})
