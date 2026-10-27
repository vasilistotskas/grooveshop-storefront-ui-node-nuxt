/**
 * The store's schema.org type: the most specific subtype of Organization
 * that holds (Google's Organization structured data guidelines).
 *
 * A store that takes orders is an `OnlineStore`; one with a place shoppers
 * visit (opening hours or a map location) is also a `Store`, the
 * LocalBusiness subtype that may carry `openingHoursSpecification` and
 * `geo`. A postal address alone is where the business is registered, not a
 * shop: every Organization carries `address`. A catalogue-only store with
 * no shop is a plain `Organization`.
 */
export function organizationSchemaType(store: { takesOrders: boolean, hasPhysicalStore: boolean }): string | string[] {
  const types = [
    ...(store.takesOrders ? ['OnlineStore'] : []),
    ...(store.hasPhysicalStore ? ['Store'] : []),
  ]
  if (types.length === 0) return 'Organization'
  return types.length === 1 ? types[0]! : types
}
