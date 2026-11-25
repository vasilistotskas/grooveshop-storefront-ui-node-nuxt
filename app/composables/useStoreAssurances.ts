import type { RouteLocationRaw } from 'vue-router'

export interface StoreAssuranceRow {
  kind: 'delivery' | 'freeShipping' | 'returns' | 'payment'
  icon: string
  title: string
  /** The line under the title, when the row has one. */
  note?: string
  to?: RouteLocationRaw
}

/**
 * The store's shopping promises as the `store_assurances` band states them,
 * one row each: delivery (with the dispatch cutoff under it), free shipping
 * (with what each carrier charges below it; a delivery or a price the store
 * offers only in some regions names them), returns (linked to the return
 * policy once it is published) and the ways to pay.
 *
 * The facts are the ones the product page's assurances read
 * (`useStoreAssuranceFacts`); this picks the band's four rows from them, each
 * left out when its fact is missing, so the band is empty, and draws nothing,
 * when the store has said none of it. The band is gated by its own presence
 * on the page, not by the product page's `productAssurances` preference.
 */
export async function useStoreAssurances() {
  const { $i18n } = useNuxtApp()

  const facts = await useStoreAssuranceFacts()

  /** Region names as one phrase in the page's language ("Attica and Crete"). */
  const regionList = (regions: string[]) =>
    new Intl.ListFormat($i18n.locale.value, { type: 'conjunction' }).format(regions)

  /** How long delivery takes, and where, when it is promised to some regions only. */
  const deliveryTitle = ({ min, max, regions }: NonNullable<StoreAssuranceFacts['deliveryDays']>) => {
    if (regions.length) {
      return min === max
        ? $i18n.t('store_assurances.delivery_days_in', { count: min, regions: regionList(regions) }, min)
        : $i18n.t('store_assurances.delivery_range_in', { min, max, regions: regionList(regions) })
    }
    return min === max
      ? $i18n.t('store_assurances.delivery_days', { count: min }, min)
      : $i18n.t('store_assurances.delivery_range', { min, max })
  }

  const rows = computed<StoreAssuranceRow[]>(() => {
    const known = facts.value
    if (!known) return []

    const price = (amount: number) => $i18n.n(amount, 'currency')
    const days = known.deliveryDays
    const found: Array<StoreAssuranceRow | null> = [
      days && {
        kind: 'delivery',
        icon: 'i-lucide-truck',
        title: deliveryTitle(days),
        note: known.dispatchCutoff
          ? $i18n.t('store_assurances.dispatch_cutoff', { time: known.dispatchCutoff })
          : undefined,
      },
      known.freeShippingFrom !== null
        ? {
            kind: 'freeShipping',
            icon: 'i-lucide-package',
            title: $i18n.t('store_assurances.free_shipping_from', { amount: price(known.freeShippingFrom) }),
            note: known.carrierPrices.length
              ? known.carrierPrices
                  .map(({ carrier, price: amount, regions }) => regions.length
                    ? $i18n.t('store_assurances.carrier_price_in', { carrier, price: price(amount), regions: regionList(regions) })
                    : $i18n.t('store_assurances.carrier_price', { carrier, price: price(amount) }))
                  .join(' · ')
              : undefined,
          }
        : null,
      known.returnDays !== null
        ? {
            kind: 'returns',
            icon: 'i-lucide-undo-2',
            title: $i18n.t('store_assurances.returns', { count: known.returnDays }, known.returnDays),
            to: known.returnPolicy,
          }
        : null,
      known.payment
        ? { kind: 'payment', icon: 'i-lucide-credit-card', title: known.payment }
        : null,
    ]
    return found.filter(row => row !== null)
  })

  return { rows }
}
