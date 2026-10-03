import { describe, expect, it } from 'vitest'

import { zAcsShipmentDetail, zAcsStation, zAcsTrackingEvent } from '~~/shared/openapi/zod.gen'
import { makeAcsShipment, makeAcsStation, makeAcsTrackingEvent } from '~~/test/fixtures/acs'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/** The ACS fixtures parse strictly, so a stale key fails here and names itself. */
describe('ACS fixtures', () => {
  it.each([
    ['makeAcsTrackingEvent', zAcsTrackingEvent, makeAcsTrackingEvent()],
    ['makeAcsStation', zAcsStation, makeAcsStation()],
    ['makeAcsShipment', zAcsShipmentDetail, makeAcsShipment()],
    ['makeAcsShipment, at a station with scans', zAcsShipmentDetail, makeAcsShipment({
      voucherNo: '7200123456',
      deliveryKind: 'pickup_point',
      station: makeAcsStation(),
      events: [makeAcsTrackingEvent()],
    })],
  ] as const)('%s parses strictly', (_name, schema, value) => {
    expect(problems(schema, value)).toEqual([])
  })
})
