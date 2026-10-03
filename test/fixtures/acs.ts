import type { AcsShipmentDetail, AcsStation, AcsTrackingEvent } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * An `AcsTrackingEvent` (one scan), valid against the generated
 * `zAcsTrackingEvent` (proved by `test/unit/fixtures/acs.spec.ts`).
 * Defaults: event 1, a "picked up" scan in Athens at `FIXTURE_TIMESTAMP`.
 */
export function makeAcsTrackingEvent(overrides: Partial<AcsTrackingEvent> = {}): AcsTrackingEvent {
  return {
    id: overrides.id ?? 1,
    eventTime: FIXTURE_TIMESTAMP,
    checkpointAction: 'ΠΑΡΑΛΑΒΗ ΑΠΟΣΤΟΛΗΣ',
    checkpointLocation: 'ΑΘΗΝΑ',
    notes: '',
    receivedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

/**
 * An `AcsStation` (a branch or Smartpoint), valid against the generated
 * `zAcsStation`. Defaults: station 1, an active Thessaloniki branch.
 * `uuid` follows `id`.
 */
export function makeAcsStation(overrides: Partial<AcsStation> = {}): AcsStation {
  const id = overrides.id ?? 1
  return {
    id,
    uuid: fixtureUuid(28, id),
    externalId: `ST-${id}`,
    branchCode: 'TH',
    shopKind: 1,
    name: 'ACS Καλαμαριά',
    addressLine1: 'Κομνηνών 12',
    city: 'Θεσσαλονίκη',
    postalCode: '55131',
    countryCode: 'GR',
    lat: null,
    lng: null,
    maxWeightKg: '30',
    workingHours: '',
    isActive: true,
    lastSyncedAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

/**
 * An `AcsShipmentDetail` (the order page's ACS tracking payload), valid
 * against the generated `zAcsShipmentDetail`. Defaults: shipment 1,
 * `new`, home delivery, no voucher yet (so no tracking and no label), no
 * station, no events. `uuid` follows `id`.
 */
export function makeAcsShipment(overrides: Partial<AcsShipmentDetail> = {}): AcsShipmentDetail {
  const id = overrides.id ?? 1
  return {
    id,
    uuid: fixtureUuid(29, id),
    voucherNo: null,
    shipmentState: 'new',
    shipmentStateDisplay: 'new',
    deliveryKind: 'home_delivery',
    weightGrams: 500,
    itemQuantity: 1,
    chargeType: 1,
    deliveryProducts: '',
    lastEventAt: null,
    lastPolledAt: null,
    deliveryDate: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    stationDestinationExternalId: '',
    stationBranchDestination: '',
    station: null,
    events: [],
    labelUrl: null,
    cancelRequestedAt: null,
    ...overrides,
  }
}
