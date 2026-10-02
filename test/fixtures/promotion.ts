import type { PublicPromotion } from '~~/shared/openapi/types.gen'

/**
 * A `PublicPromotion` as `/api/promotions` serves it, valid against the
 * generated `zPublicPromotion` (proved by
 * `test/unit/fixtures/promotion.spec.ts`).
 *
 * Defaults: id 1, a 10 % order-wide coupon `WELCOME10` with no
 * conditions, stackable, open-ended, applying to nothing in particular.
 */
export function makePromotion(overrides: Partial<PublicPromotion> = {}): PublicPromotion {
  return {
    id: 1,
    name: 'Καλωσόρισμα 10%',
    description: '',
    trigger: 'CODE',
    benefitType: 'PERCENTAGE',
    benefitValue: 10,
    targetScope: 'ORDER',
    code: 'WELCOME10',
    minSubtotal: null,
    maxDiscountAmount: null,
    minQuantity: null,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: 100,
    excludeDiscountedProducts: false,
    firstOrderOnly: false,
    stackable: true,
    endsAt: null,
    rewardProducts: [],
    eligibleProducts: [],
    eligibleProductCount: 0,
    eligibleCategories: [],
    ...overrides,
  }
}
