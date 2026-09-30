import type { BoxNowLocker, BoxNowParcelEvent, BoxNowShipmentDetail } from '~~/shared/openapi/types.gen'
import type { BoxNowSelectedLocker } from '~~/shared/utils/boxnow-widget'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * The `window.postMessage` payload the BoxNow widget sends when the
 * shopper picks a locker (`functions/markerClicked.js`; see the header of
 * `shared/utils/boxnow-widget.ts`). Defaults: locker 4, Χαλάνδρι, on the
 * Greek map — `boxnowCountry` is the locker record's own ISO alpha-2.
 *
 * There is no generated schema for it; `test/unit/fixtures/boxnow.spec.ts`
 * proves the default survives `parseBoxNowSelectedLocker`, the parser the
 * picker runs on every message.
 */
export function boxNowWidgetMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    boxnowLockerId: '4',
    boxnowLockerPostalCode: '15234',
    boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
    boxnowLockerName: 'Χαλάνδρι ΟΠΑΠ Play',
    boxnowCountry: 'GR',
    ...overrides,
  }
}

/**
 * The locker as checkout keeps it in `formState.boxnowLocker` — what
 * `parseBoxNowSelectedLocker(boxNowWidgetMessage())` returns.
 */
export function makeBoxNowSelectedLocker(overrides: Partial<BoxNowSelectedLocker> = {}): BoxNowSelectedLocker {
  return {
    boxnowLockerId: '4',
    boxnowLockerPostalCode: '15234',
    boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
    boxnowLockerName: 'Χαλάνδρι ΟΠΑΠ Play',
    boxnowLockerCountryCode: 'GR',
    ...overrides,
  }
}

/**
 * A `BoxNowLocker` as Django serialises it, valid against the generated
 * `zBoxNowLocker`. Defaults: locker 4 in GR, active. `uuid` follows `id`.
 */
export function makeBoxNowLocker(overrides: Partial<BoxNowLocker> = {}): BoxNowLocker {
  const id = overrides.id ?? 1
  return {
    id,
    externalId: '4',
    type: 'apm',
    imageUrl: null,
    lat: 38.02,
    lng: 23.8,
    title: 'Χαλάνδρι ΟΠΑΠ Play',
    name: 'Χαλάνδρι ΟΠΑΠ Play',
    addressLine1: 'Λεωφ. Πεντέλης 125',
    addressLine2: '',
    postalCode: '15234',
    countryCode: 'GR',
    note: '',
    isActive: true,
    lastSyncedAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(5, id),
    ...overrides,
  }
}

/**
 * A `BoxNowParcelEvent` (one webhook record), valid against the
 * generated `zBoxNowParcelEvent`. Defaults: event 1, `in_depot`.
 */
export function makeBoxNowParcelEvent(overrides: Partial<BoxNowParcelEvent> = {}): BoxNowParcelEvent {
  const id = overrides.id ?? 1
  const eventType = overrides.eventType ?? 'in_depot'
  return {
    id,
    webhookMessageId: `msg-${id}`,
    eventType,
    eventTypeDisplay: eventType,
    parcelState: eventType,
    eventTime: FIXTURE_TIMESTAMP,
    displayName: '',
    postalCode: '',
    additionalInformation: '',
    receivedAt: FIXTURE_TIMESTAMP,
    createdAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

/**
 * A `BoxNowShipmentDetail` (the order page's tracking payload), valid
 * against the generated `zBoxNowShipmentDetail`. Defaults: shipment 1,
 * `new`, no parcel id yet (so no voucher and no label), no locker, no
 * events, prepaid. `uuid` follows `id`.
 */
export function makeBoxNowShipment(overrides: Partial<BoxNowShipmentDetail> = {}): BoxNowShipmentDetail {
  const id = overrides.id ?? 1
  return {
    id,
    uuid: fixtureUuid(6, id),
    deliveryRequestId: null,
    parcelId: null,
    lockerExternalId: '4',
    parcelState: 'new',
    parcelStateDisplay: 'new',
    compartmentSize: 1,
    paymentMode: 'prepaid',
    lastEventAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    locker: null,
    events: [],
    labelUrl: null,
    weightGrams: 500,
    amountToBeCollected: 0,
    allowReturn: false,
    cancelRequestedAt: null,
    ...overrides,
  }
}
