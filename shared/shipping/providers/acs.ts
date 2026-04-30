/**
 * ACS Courier carrier adapter — mirror of the Python
 * ``shipping_acs/carrier.py::AcsCarrier``.
 *
 * Registered by ``shared/shipping/registry.ts`` via static import
 * (Nitro's rollup bundler can't run Vite's ``import.meta.glob``).
 * Adding ELTA / Speedex / Geniki: drop a sibling file under
 * ``shared/shipping/providers/`` and add an import + array entry
 * to ``registry.ts``.
 *
 * Form-state contract: writes to the existing
 * ``acsStationExternalId`` / ``acsStationBranch`` / ``acsStation``
 * keys on the checkout form. Renaming any of those is a breaking
 * change against persisted drafts and the order-create payload.
 */
import type { Locker, LockerQuery, ShippingCarrier } from '../interfaces'

function _normalize(row: AcsStation): Locker | null {
  const id = row.externalId.trim()
  if (!id) return null
  return {
    id,
    branchCode: row.branchCode || null,
    name: row.name || id,
    addressLine1: row.addressLine1,
    // ``AcsStation`` collapses the address into a single line —
    // keep ``addressLine2`` null so other carriers can still
    // surface a second line in the future.
    addressLine2: null,
    city: row.city,
    postalCode: row.postalCode,
    countryCode: (row.countryCode || 'GR').toUpperCase(),
    lat: row.lat,
    lng: row.lng,
    workingHours: row.workingHours || null,
    maxWeightKg: row.maxWeightKg ?? null,
    raw: row,
  }
}

const acsCarrier: ShippingCarrier = {
  code: 'acs',
  label: 'ACS Courier',
  usesGenericPicker: true,
  formFieldName: 'acsStationExternalId',

  async fetchByPostal(query: LockerQuery): Promise<Locker[]> {
    const params: Record<string, string> = {
      postalCode: query.postalCode,
    }
    if (query.city) params.city = query.city
    if (query.country) params.countryCode = query.country
    if (query.shopKind) params.shopKind = String(query.shopKind)

    const rows = await $fetch<AcsStation[]>(
      '/api/shipping/acs/nearest',
      {
        method: 'GET',
        query: params,
        signal: query.signal,
      },
    )
    return (rows ?? []).map(_normalize).filter(Boolean) as Locker[]
  },

  async fetchAll(country: string, signal?: AbortSignal): Promise<Locker[]> {
    const rows = await $fetch<AcsStation[]>(
      `/api/shipping/lockers/${this.code}`,
      {
        method: 'GET',
        query: { country },
        signal,
      },
    )
    return (rows ?? []).map(_normalize).filter(Boolean) as Locker[]
  },

  applyToFormState(formState: Record<string, any>, locker: Locker): void {
    // Backwards-compatible shape: the order-create payload + Zod
    // schema both still reference these keys verbatim. Deviate at
    // your peril — see ``app/composables/useCheckoutForm.ts``.
    formState.acsStationExternalId = locker.id
    formState.acsStationBranch = locker.branchCode ?? ''
    formState.acsStation = {
      externalId: locker.id,
      branchCode: locker.branchCode ?? null,
      name: locker.name,
      addressLine1: locker.addressLine1,
      addressLine2: locker.addressLine2 ?? null,
      city: locker.city,
      postalCode: locker.postalCode,
      countryCode: locker.countryCode,
      workingHours: locker.workingHours ?? null,
    }
  },

  readLockerId(formState: Record<string, any>): string | null {
    const id = formState.acsStationExternalId
    return typeof id === 'string' && id.length > 0 ? id : null
  },

  readSelectedLocker(formState: Record<string, any>): Locker | null {
    const stored = formState.acsStation
    if (!stored || typeof stored !== 'object') return null
    const id = stored.externalId
    if (typeof id !== 'string' || id.length === 0) return null
    return {
      id,
      branchCode: stored.branchCode ?? null,
      name: stored.name ?? id,
      addressLine1: stored.addressLine1 ?? '',
      addressLine2: stored.addressLine2 ?? null,
      city: stored.city ?? '',
      postalCode: stored.postalCode ?? '',
      countryCode: stored.countryCode ?? 'GR',
      lat: null,
      lng: null,
      workingHours: stored.workingHours ?? null,
      maxWeightKg: null,
      raw: stored,
    }
  },
}

export default acsCarrier
