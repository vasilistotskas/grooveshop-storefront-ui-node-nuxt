import * as z from 'zod'

/**
 * Render-time contract for the `STORE_OFFICES` extra-setting.
 *
 * Mirrors `tenant.validators.validate_store_offices_setting` — keep the
 * two in sync. Django stops NEW bad data at the admin/API boundary with
 * a readable error; this is the fail-soft side, so historical bad data
 * degrades to no offices rather than a broken block.
 *
 * These are the merchant's PUBLIC offices, not the registered seat that
 * `useMerchantIdentity()` returns. The seat is where a legal notice
 * goes; an office is where a customer visits, and a merchant often has
 * several that are none of them the seat.
 *
 * `i18n` is a PARTIAL override of the text keys only. A postcode and a
 * phone number read the same in every language, so duplicating them per
 * locale would only let the copies drift — the same rule as
 * `PageSection.i18n`.
 */
export const zStoreOfficeI18n = z
  .object({
    label: z.string().optional(),
    street: z.string().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
  })
  .strip()

export const zStoreOffice = z
  .object({
    label: z.string().min(1),
    street: z.string().min(1),
    area: z.string().optional(),
    postal: z.string().optional(),
    city: z.string().optional(),
    phones: z.array(z.string()).max(6).optional(),
    i18n: z.record(z.string(), zStoreOfficeI18n).optional(),
  })
  .strip()

export const zStoreOffices = z.array(zStoreOffice).max(10)

export type StoreOfficeInput = z.infer<typeof zStoreOffice>

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

/**
 * Parse the raw setting string. `null` means "no usable offices" — an
 * absent setting, the empty `[]` default, or a shape that fails the
 * contract, which the caller distinguishes only for logging.
 */
export function parseStoreOfficesValue(
  raw: string | undefined | null,
): StoreOfficeInput[] | null {
  if (!raw) return null
  let json: unknown
  try {
    json = JSON.parse(raw)
  }
  catch {
    return null
  }
  const parsed = zStoreOffices.safeParse(json)
  if (!parsed.success || parsed.data.length === 0) return null
  return parsed.data
}
