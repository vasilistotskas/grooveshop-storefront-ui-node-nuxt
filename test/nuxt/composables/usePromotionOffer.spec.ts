import { describe, it, expect, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

/**
 * The offer vocabulary the `/offers` page, the product panel and the
 * checkout picker all render from. Three surfaces reading one Django
 * shape is the reason it exists, so the cases that used to be a
 * per-page `switch` are pinned here once.
 *
 * i18n returns real Greek in the nuxt environment, so the assertions
 * check SHAPE (an interpolated number, a non-empty string, the right
 * number of conditions) rather than exact copy.
 */

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((..._args: any[]) => Promise.resolve({})),
}))
mockNuxtImport('$fetch', () => mockFetch)

function offer(over: Record<string, any> = {}) {
  return {
    name: 'Προσφορά',
    benefitType: 'PERCENTAGE',
    benefitValue: 10,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: 100,
    minSubtotal: null,
    minQuantity: null,
    maxDiscountAmount: null,
    firstOrderOnly: false,
    excludeDiscountedProducts: false,
    stackable: true,
    ...over,
  } as any
}

describe('usePromotionOffer', () => {
  it('leads with the percentage for a percentage benefit', () => {
    const { headline } = usePromotionOffer()

    expect(headline(offer({ benefitValue: 20 }))).toContain('20')
  })

  it('formats a fixed-amount benefit as money', () => {
    const { headline } = usePromotionOffer()

    // Greek locale currency formatting — comma decimal separator.
    expect(headline(offer({
      benefitType: 'FIXED_AMOUNT',
      benefitValue: 5,
    }))).toMatch(/5,00/)
  })

  it('says FREE for a 100% BXGY and DISCOUNTED below that', () => {
    const { headline } = usePromotionOffer()
    const bxgy = (getDiscountPercent: number) => headline(offer({
      benefitType: 'BXGY',
      buyQuantity: 2,
      getQuantity: 1,
      getDiscountPercent,
    }))

    // "2+1 δώρο" vs "2+1 με -50%" — the partial case must not claim
    // the reward is free.
    expect(bxgy(100)).toContain('2')
    expect(bxgy(100)).not.toContain('50')
    expect(bxgy(50)).toContain('50')
  })

  it('falls back to the promotion name for an unknown benefit type', () => {
    const { headline } = usePromotionOffer()

    expect(headline(offer({ benefitType: 'SOMETHING_NEW', name: 'Νέο' })))
      .toBe('Νέο')
  })

  it('lists only the conditions that are actually set', () => {
    const { conditions } = usePromotionOffer()

    expect(conditions(offer())).toEqual([])
    expect(conditions(offer({
      minSubtotal: 40,
      maxDiscountAmount: 10,
      firstOrderOnly: true,
      excludeDiscountedProducts: true,
      stackable: false,
    }))).toHaveLength(5)
  })

  it('ignores a minimum quantity of one — every cart meets it', () => {
    const { conditions } = usePromotionOffer()

    expect(conditions(offer({ minQuantity: 1 }))).toEqual([])
    expect(conditions(offer({ minQuantity: 3 }))).toHaveLength(1)
  })

  it('ignores a zero threshold rather than printing "from 0,00 €"', () => {
    const { conditions } = usePromotionOffer()

    expect(conditions(offer({ minSubtotal: 0, maxDiscountAmount: 0 })))
      .toEqual([])
  })

  it('returns no expiry for an open-ended offer', () => {
    const { expiry } = usePromotionOffer()

    expect(expiry(null)).toBeNull()
    expect(expiry('not-a-date')).toBeNull()
  })

  it('phrases a near expiry as urgency and a distant one as a date', () => {
    const { expiry } = usePromotionOffer()
    const inDays = (days: number) =>
      new Date(Date.now() + days * 86_400_000).toISOString()

    expect(expiry(inDays(3))).toMatch(/3/)
    // Beyond a week the countdown stops helping, so it becomes a date
    // and must NOT read as "in 30 days".
    const distant = expiry(inDays(30))
    expect(distant).toBeTruthy()
    expect(distant).not.toMatch(/\b30\b/)
  })

  it('translates an ACP rejection reason and survives an unknown one', () => {
    const { rejectionMessage } = usePromotionOffer()

    const known = rejectionMessage('discount_code_minimum_not_met')
    expect(known).toContain('ελάχιστο ποσό')

    // Django owns the vocabulary and can gain a value first; the
    // shopper must never be shown the raw key path.
    const unknown = rejectionMessage('discount_code_from_the_future')
    expect(unknown).not.toContain('promotion.rejection')
    expect(unknown).toBe(rejectionMessage(null))
  })

  it('gives every benefit type its own icon and colour', () => {
    const { icon, color } = usePromotionOffer()
    const types = [
      'PERCENTAGE',
      'FIXED_AMOUNT',
      'FREE_SHIPPING',
      'BXGY',
      'FREE_GIFT',
    ]

    for (const benefitType of types) {
      expect(icon(offer({ benefitType }))).toMatch(/^i-heroicons-/)
      expect(color(offer({ benefitType }))).toEqual(expect.any(String))
    }
    // An unmapped type still renders something rather than undefined.
    expect(icon(offer({ benefitType: 'NEW' }))).toMatch(/^i-heroicons-/)
    expect(color(offer({ benefitType: 'NEW' }))).toBe('primary')
  })
})
