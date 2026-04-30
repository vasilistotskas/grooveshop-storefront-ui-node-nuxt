/**
 * ACS Courier carrier adapter — mirror of the Python
 * ``shipping_acs/carrier.py::AcsCarrier``.
 *
 * Auto-registered by ``shared/shipping/registry.ts`` via
 * ``import.meta.glob('./providers/*.ts')`` — drop a sibling file
 * for ELTA / Speedex and the registry picks it up the same way.
 *
 * Form-state contract: writes to the existing
 * ``acsStationExternalId`` / ``acsStationBranch`` / ``acsStation``
 * keys on the checkout form. Renaming any of those is a breaking
 * change against persisted drafts and the order-create payload.
 */
import type { Locker, LockerQuery, ShippingCarrier } from '../interfaces'

interface AcsStationApiRow {
  id?: number | string
  externalId?: string | null
  branchCode?: string | null
  shopKind?: number
  name?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  postalCode?: string | null
  countryCode?: string | null
  /** Django serialises Decimal as string; we parse to ``number``. */
  lat?: string | number | null
  lng?: string | number | null
  workingHours?: string | null
  maxWeightKg?: string | number | null
  region?: string | null
  phone?: string | null
}

function _toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function _normalize(row: AcsStationApiRow): Locker | null {
  const id = (row.externalId ?? '').trim()
  if (!id) return null
  return {
    id,
    branchCode: row.branchCode ?? null,
    name: row.name ?? id,
    addressLine1: row.addressLine1 ?? '',
    addressLine2: row.addressLine2 ?? null,
    city: row.city ?? '',
    postalCode: row.postalCode ?? '',
    countryCode: (row.countryCode ?? 'GR').toUpperCase(),
    lat: _toNumber(row.lat ?? null),
    lng: _toNumber(row.lng ?? null),
    workingHours: row.workingHours ?? null,
    maxWeightKg: _toNumber(row.maxWeightKg ?? null),
    raw: row,
  }
}

const acsCarrier: ShippingCarrier = {
  code: 'acs',
  label: 'ACS Courier',
  usesGenericPicker: true,

  async fetchByPostal(query: LockerQuery): Promise<Locker[]> {
    const params: Record<string, string> = {
      postalCode: query.postalCode,
    }
    if (query.city) params.city = query.city
    if (query.country) params.countryCode = query.country
    if (query.shopKind) params.shopKind = String(query.shopKind)

    const rows = await $fetch<AcsStationApiRow[]>(
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
    const rows = await $fetch<AcsStationApiRow[]>(
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
