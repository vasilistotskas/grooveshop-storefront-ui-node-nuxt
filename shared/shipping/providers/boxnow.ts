/**
 * BOX NOW carrier adapter, a mirror of the Python
 * ``shipping_boxnow/carrier.py::BoxNowCarrier``.
 *
 * The checkout picks a BOX NOW locker in the generic picker, like any
 * carrier with a catalogue: Django syncs BOX NOW's lockers daily
 * (``BoxNowService.sync_lockers``) and the storefront reads them through
 * ``/api/shipping/lockers/boxnow``. BOX NOW's own map widget is not used:
 * its only control over which lockers it shows was the partner account's
 * typical parcel size or an undocumented URL parameter.
 *
 * Only the lockers with a compartment of the cart's size are offered: the
 * quote names the size (`QuoteShippingOption.compartmentSize`) and Django
 * filters on it, the same exact match BOX NOW's own picker makes.
 * `limitedAvailability` is BOX NOW's estimate that few compartments are
 * free there today.
 *
 * Form-state contract: ``boxnowLockerId`` (the order's ``boxnowLockerId``)
 * and ``boxnowLocker``, what the cards show (``BoxNowPickedLocker``).
 */
import type { Locker, LockerQuery, ShippingCarrier } from '../interfaces'

/** A row of ``/api/shipping/lockers/boxnow`` (the route's normalised locker). */
interface BoxNowCatalogueRow {
  externalId: string
  name: string
  addressLine1: string
  addressLine2: string
  postalCode: string
  countryCode: string
  lat: number
  lng: number
  note: string
  limitedAvailability: boolean
}

function _normalize(row: BoxNowCatalogueRow): Locker | null {
  const id = row.externalId.trim()
  if (!id) return null
  return {
    key: id,
    id,
    name: row.name || id,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2 || null,
    // BOX NOW's catalogue names no city: its address line and postcode do.
    city: '',
    postalCode: row.postalCode,
    countryCode: (row.countryCode || 'GR').toUpperCase(),
    lat: row.lat,
    lng: row.lng,
    workingHours: row.note || null,
    limitedAvailability: row.limitedAvailability,
    raw: row,
  }
}

const boxnowCarrier: ShippingCarrier = {
  code: 'boxnow',
  label: 'BOX NOW',
  formFieldName: 'boxnowLockerId',
  // A locker has compartments of some of three sizes; the order fits
  // only one with a compartment of its cart's size (#204).
  sizesLockers: true,

  async fetchAll({ country, compartmentSize }: LockerQuery, signal?: AbortSignal): Promise<Locker[]> {
    const rows = await $fetch<BoxNowCatalogueRow[]>(
      `/api/shipping/lockers/${this.code}`,
      {
        method: 'GET',
        query: { country, compartmentSize: compartmentSize ?? undefined },
        signal,
      },
    )
    return (rows ?? []).map(_normalize).filter(Boolean) as Locker[]
  },

  applyToFormState(formState: Record<string, unknown>, locker: Locker): void {
    formState.boxnowLockerId = locker.id
    const picked: BoxNowPickedLocker = {
      externalId: locker.id,
      name: locker.name,
      addressLine1: locker.addressLine1,
      addressLine2: locker.addressLine2 ?? '',
      postalCode: locker.postalCode,
      countryCode: locker.countryCode,
      note: locker.workingHours ?? '',
    }
    formState.boxnowLocker = picked
  },

  readLockerId(formState: Record<string, unknown>): string | null {
    const id = formState.boxnowLockerId
    return typeof id === 'string' && id.length > 0 ? id : null
  },

  buildOrderPayload(
    formState: Record<string, unknown>,
  ): Partial<OrderCreateFromCartRequestWritable> {
    const payload: Partial<OrderCreateFromCartRequestWritable> = {}
    const lockerId = formState.boxnowLockerId
    if (typeof lockerId === 'string' && lockerId.length > 0) {
      payload.boxnowLockerId = lockerId
    }
    return payload
  },

  readSelectedLocker(formState: Record<string, unknown>): Locker | null {
    const stored = formState.boxnowLocker as BoxNowPickedLocker | null | undefined
    if (!stored || typeof stored !== 'object') return null
    const id = stored.externalId
    if (typeof id !== 'string' || id.length === 0) return null
    return {
      key: id,
      id,
      name: stored.name || id,
      addressLine1: stored.addressLine1,
      addressLine2: stored.addressLine2 || null,
      city: '',
      postalCode: stored.postalCode,
      countryCode: stored.countryCode,
      lat: null,
      lng: null,
      workingHours: stored.note || null,
      raw: stored,
    }
  },
}

export default boxnowCarrier
