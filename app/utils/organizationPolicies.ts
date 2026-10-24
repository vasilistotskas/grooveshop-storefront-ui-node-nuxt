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

/**
 * The return policy as a link to the store's own page, Google's minimal
 * form: the page states the window, fees and conditions, so nothing is
 * restated here that could drift from it. `undefined` when the store has
 * published no return policy.
 */
export function merchantReturnPolicySchema(returnPolicyUrl: string | undefined) {
  if (!returnPolicyUrl) return undefined
  return {
    '@type': 'MerchantReturnPolicy' as const,
    'merchantReturnLink': returnPolicyUrl,
  }
}
