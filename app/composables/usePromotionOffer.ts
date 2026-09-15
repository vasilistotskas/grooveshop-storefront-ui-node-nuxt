/**
 * One vocabulary for promotions, shared by every surface that shows
 * them: the `/offers` page, the product page's offer panel and the
 * checkout coupon picker.
 *
 * Django publishes the same `PublicPromotion` shape to all three (the
 * product panel adds `relation`, the picker nests it beside a verdict),
 * so the rules for turning a row into "-20%" or "2+1 δώρο" belong in
 * one place. They started as private functions on the offers page; a
 * second copy on the product panel would have drifted the first time a
 * benefit type changed.
 *
 * Strings live in the global `promotion.*` namespace rather than a
 * component `<i18n>` block precisely because a composable cannot read a
 * component-scoped one — and `useNuxtApp().$i18n`, not `useI18n()`,
 * because the latter needs component context and duplicates the scope.
 */

/** The offer shape every surface has in common. */
type OfferLike = Pick<
  PublicPromotion,
  | 'benefitType'
  | 'benefitValue'
  | 'buyQuantity'
  | 'getQuantity'
  | 'getDiscountPercent'
  | 'minSubtotal'
  | 'minQuantity'
  | 'maxDiscountAmount'
  | 'firstOrderOnly'
  | 'excludeDiscountedProducts'
  | 'stackable'
  | 'name'
>

const BENEFIT_ICON: Record<string, string> = {
  PERCENTAGE: 'i-heroicons-receipt-percent',
  FIXED_AMOUNT: 'i-heroicons-banknotes',
  FREE_SHIPPING: 'i-heroicons-truck',
  BXGY: 'i-heroicons-squares-plus',
  FREE_GIFT: 'i-heroicons-gift',
}

const BENEFIT_COLOR: Record<string, 'primary' | 'secondary' | 'success' | 'info'> = {
  PERCENTAGE: 'primary',
  FIXED_AMOUNT: 'primary',
  FREE_SHIPPING: 'success',
  BXGY: 'info',
  FREE_GIFT: 'secondary',
}

export function usePromotionOffer() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const n = $i18n.n.bind($i18n)

  /** The headline claim, per benefit type — the card's loudest text. */
  function headline(offer: OfferLike): string {
    switch (offer.benefitType) {
      case 'PERCENTAGE':
        return t('promotion.benefit.percentage', {
          value: Number(offer.benefitValue),
        })
      case 'FIXED_AMOUNT':
        return t('promotion.benefit.fixed', {
          amount: n(Number(offer.benefitValue), 'currency'),
        })
      case 'FREE_SHIPPING':
        return t('promotion.benefit.free_shipping')
      case 'BXGY':
        // A getDiscountPercent of 100 is the ordinary "buy X get Y
        // free"; anything less is a partial markdown on the reward
        // units, and saying "free" there would be a lie.
        return Number(offer.getDiscountPercent) >= 100
          ? t('promotion.benefit.bxgy_free', {
              buy: offer.buyQuantity ?? 1,
              get: offer.getQuantity ?? 1,
            })
          : t('promotion.benefit.bxgy_discounted', {
              buy: offer.buyQuantity ?? 1,
              get: offer.getQuantity ?? 1,
              value: Number(offer.getDiscountPercent),
            })
      case 'FREE_GIFT':
        return t('promotion.benefit.free_gift')
      default:
        return offer.name
    }
  }

  /**
   * The fine print, in the order a shopper cares about it. A list
   * rather than a sentence so a card with one condition does not
   * render a paragraph.
   */
  function conditions(offer: OfferLike): string[] {
    const out: string[] = []
    if (offer.minSubtotal !== null && Number(offer.minSubtotal) > 0) {
      out.push(t('promotion.condition.min_subtotal', {
        amount: n(Number(offer.minSubtotal), 'currency'),
      }))
    }
    if (offer.minQuantity !== null && Number(offer.minQuantity) > 1) {
      out.push(t('promotion.condition.min_quantity', {
        count: offer.minQuantity,
      }))
    }
    if (offer.maxDiscountAmount !== null && Number(offer.maxDiscountAmount) > 0) {
      out.push(t('promotion.condition.max_discount', {
        amount: n(Number(offer.maxDiscountAmount), 'currency'),
      }))
    }
    if (offer.firstOrderOnly) out.push(t('promotion.condition.first_order'))
    if (offer.excludeDiscountedProducts) {
      out.push(t('promotion.condition.no_sale_items'))
    }
    if (!offer.stackable) out.push(t('promotion.condition.not_stackable'))
    return out
  }

  const icon = (offer: OfferLike): string =>
    BENEFIT_ICON[offer.benefitType] ?? 'i-heroicons-tag'

  const color = (offer: OfferLike) =>
    BENEFIT_COLOR[offer.benefitType] ?? 'primary'

  /**
   * How close the offer is to ending, phrased as urgency rather than a
   * bare date — "Λήγει σε 3 ημέρες" is a reason to act; "10 Οκτ" is
   * trivia. Returns null for an open-ended offer, and for one more than
   * a week out it falls back to the date.
   */
  function expiry(endsAt: string | null): string | null {
    if (!endsAt) return null
    const end = new Date(endsAt)
    if (Number.isNaN(end.getTime())) return null
    const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000)
    if (days <= 0) return t('promotion.expiry.today')
    if (days === 1) return t('promotion.expiry.tomorrow')
    if (days <= 7) return t('promotion.expiry.days', { count: days }, days)
    return t('promotion.expiry.on', {
      date: end.toLocaleDateString($i18n.locale.value, {
        day: 'numeric',
        month: 'short',
      }),
    })
  }

  /**
   * A refusal from the ACP discount vocabulary, in the shopper's
   * language. Django returns these both as a 400 `reason` on apply and
   * as the picker's per-coupon verdict, so both read identically.
   */
  function rejectionMessage(reason: string | null | undefined): string {
    if (!reason) return t('promotion.rejection.generic')
    const key = `promotion.rejection.${reason}`
    const message = t(key)
    // vue-i18n echoes the key path when a message is missing, which
    // would show a shopper `promotion.rejection.discount_code_foo`.
    // The vocabulary is Django's, so it can gain a value before the
    // storefront learns the word for it.
    return message === key ? t('promotion.rejection.generic') : message
  }

  return { headline, conditions, icon, color, expiry, rejectionMessage }
}
