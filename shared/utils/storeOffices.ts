/**
 * Reading helper for the merchant's PUBLIC offices Django serves typed on
 * `GET /settings/public` (`StoreOffice`, generated).
 *
 * These are not the registered seat that `useMerchantIdentity()` returns.
 * The seat is where a legal notice goes; an office is where a customer
 * visits, and a merchant often has several that are none of them the seat.
 */

/**
 * The one-line address the artboards print:
 * `street, area postal, city` — "Γ. Ρίτσου 7, Καλαμαριά 551 32,
 * Θεσσαλονίκη". The postcode rides with the AREA rather than the city,
 * which is how a Greek address is written and what the design shows;
 * every part is optional except the street.
 */
export function formatOfficeAddress(office: {
  street: string
  area?: string
  postal?: string
  city?: string
}): string {
  const locality = [office.area, office.postal].filter(Boolean).join(' ')
  return [office.street, locality, office.city].filter(Boolean).join(', ')
}
