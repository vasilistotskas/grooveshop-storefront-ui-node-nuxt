export interface StoreOffice {
  label: string
  street: string
  area?: string
  postal?: string
  city?: string
  /** The short word a design prints beside an office ("ΕΔΡΑ"). */
  role?: string
  phones: string[]
  /** See `formatOfficeAddress`. */
  addressLine: string
}

/**
 * THE reader for the `STORE_OFFICES` extra-setting — the merchant's
 * PUBLIC offices, resolved for the active locale.
 *
 * Not the same thing as `useMerchantIdentity()`, which returns the
 * registered seat: the seat is where a legal notice goes, an office is
 * where a customer visits, and a merchant often has several that are
 * none of them the seat.
 *
 * Fail-open chrome, matching `useBusinessHours`: an absent setting, the
 * empty default, or a shape that fails the contract all resolve to an
 * empty list and every consumer renders nothing.
 *
 * The locale overlay is a PARTIAL merge — see `#shared/schemas/
 * storeOffices` for why the numbers are not part of it.
 */
export function useStoreOffices() {
  const { locale } = useI18n()
  const { data } = useFetch<{ value?: string }>('/api/settings/get', {
    key: 'setting-json:STORE_OFFICES',
    query: { key: 'STORE_OFFICES' },
    default: () => ({ value: '' }),
  })

  const parsed = computed(() => {
    const raw = data.value?.value
    const offices = parseStoreOfficesValue(raw)
    if (offices === null && raw && raw !== '[]') {
      log.warn({
        tag: 'store-offices',
        message: 'STORE_OFFICES setting failed shape validation',
      })
    }
    return offices ?? []
  })

  const offices = computed<StoreOffice[]>(() =>
    parsed.value.map((office) => {
      const merged = { ...office, ...(office.i18n?.[locale.value] ?? {}) }
      return {
        label: merged.label,
        street: merged.street,
        area: merged.area,
        postal: merged.postal,
        city: merged.city,
        role: merged.role,
        phones: office.phones ?? [],
        addressLine: formatOfficeAddress(merged),
      }
    }),
  )

  /** Every office's phones, de-duplicated, in office order. */
  const phones = computed<string[]>(() => [
    ...new Set(offices.value.flatMap(office => office.phones)),
  ])

  return {
    offices,
    phones,
    hasOffices: computed(() => offices.value.length > 0),
  }
}
