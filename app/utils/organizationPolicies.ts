/**
 * The store's shipping and return policies as the Organization node
 * states them (Google's organization-level merchant policies), built
 * from what the store really offers: never a default.
 */

/** How a shopper receives a parcel of each kind (schema.org FulfillmentTypeEnumeration). */
const FULFILLMENT_TYPE: Record<ShippingKind, string> = {
  home_delivery: 'https://schema.org/FulfillmentTypeDelivery',
  pickup_point: 'https://schema.org/FulfillmentTypeCollectionPoint',
}

function money(value: number, currency: string) {
  return { '@type': 'MonetaryAmount' as const, value, currency }
}

function transitTime(entry: ShippingPolicyEntry) {
  if (entry.deliveryDaysMin == null && entry.deliveryDaysMax == null) return undefined
  return {
    '@type': 'ServicePeriod' as const,
    'duration': {
      '@type': 'QuantitativeValue' as const,
      'minValue': entry.deliveryDaysMin ?? entry.deliveryDaysMax,
      'maxValue': entry.deliveryDaysMax ?? entry.deliveryDaysMin,
      'unitCode': 'DAY',
    },
  }
}

/**
 * One ShippingService per carrier and kind, with a condition per country
 * it delivers to. Above a free-shipping threshold a second condition
 * prices the parcel at 0: Google takes the lowest-cost condition that
 * matches an order, so the paid one needs no upper bound.
 */
export function shippingServicesSchema(entries: readonly ShippingPolicyEntry[]) {
  const services = new Map<string, ShippingPolicyEntry[]>()
  for (const entry of entries) {
    const key = `${entry.providerCode}:${entry.kind}`
    services.set(key, [...(services.get(key) ?? []), entry])
  }

  return [...services.values()].map(rows => ({
    '@type': 'ShippingService' as const,
    'name': rows[0]!.providerName,
    'fulfillmentType': FULFILLMENT_TYPE[rows[0]!.kind],
    'shippingConditions': rows.flatMap((entry) => {
      const destination = { '@type': 'DefinedRegion' as const, 'addressCountry': entry.countryCode }
      const paid = {
        '@type': 'ShippingConditions' as const,
        'shippingDestination': destination,
        'shippingRate': money(entry.price, entry.currency),
        'transitTime': transitTime(entry),
      }
      if (entry.freeShippingThreshold == null) return [paid]
      return [paid, {
        ...paid,
        orderValue: {
          '@type': 'MonetaryAmount' as const,
          'minValue': entry.freeShippingThreshold,
          'currency': entry.currency,
        },
        shippingRate: money(0, entry.currency),
      }]
    }),
  }))
}

/** Who pays to send a return back (`RETURN_FEES`), as schema.org names it. */
const RETURN_FEES = {
  free: 'https://schema.org/FreeReturn',
  customer: 'https://schema.org/ReturnFeesCustomerResponsibility',
} as const

export type ReturnFees = keyof typeof RETURN_FEES

/** `RETURN_WINDOW_DAYS` as days; `null` when unset, 0 (not stated) or not a whole number. */
export function returnWindowDays(raw: string): number | null {
  const value = Number(raw)
  if (!raw.trim() || !Number.isInteger(value) || value <= 0) return null
  return value
}

/** `RETURN_FEES`; `null` when the store has not said. */
export function returnFees(raw: string): ReturnFees | null {
  return raw === 'free' || raw === 'customer' ? raw : null
}

/**
 * The store's return policy, Google's organization-level form. With a
 * return window and the countries the store ships to, the terms
 * themselves (a finite window of so many days, and who pays the return
 * shipping when the store has said), beside the link to its own page.
 * Without them, the link alone, Google's minimal form. `undefined` when
 * the store states neither.
 */
export function merchantReturnPolicySchema(policy: {
  link: string | undefined
  windowDays: number | null
  fees: ReturnFees | null
  countries: readonly string[]
}) {
  const terms = policy.windowDays && policy.countries.length > 0
    ? {
        applicableCountry: [...policy.countries],
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: policy.windowDays,
        ...(policy.fees ? { returnFees: RETURN_FEES[policy.fees] } : {}),
      }
    : undefined
  if (!terms && !policy.link) return undefined
  return {
    '@type': 'MerchantReturnPolicy' as const,
    ...terms,
    ...(policy.link ? { merchantReturnLink: policy.link } : {}),
  }
}
