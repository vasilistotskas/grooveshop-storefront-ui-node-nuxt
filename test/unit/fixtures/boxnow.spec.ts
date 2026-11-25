import { describe, expect, it } from 'vitest'

import { zBoxNowLocker, zBoxNowParcelEvent, zBoxNowShipmentDetail } from '~~/shared/openapi/zod.gen'
import {
  makeBoxNowLocker,
  makeBoxNowParcelEvent,
  makeBoxNowShipment,
} from '~~/test/fixtures/boxnow'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/** The Django payloads parse strictly through their generated schemas. */
describe('BoxNow fixtures', () => {
  it('makeBoxNowLocker parses through zBoxNowLocker', () => {
    expect(problems(zBoxNowLocker, makeBoxNowLocker())).toEqual([])
  })

  it('makeBoxNowParcelEvent parses through zBoxNowParcelEvent', () => {
    expect(problems(zBoxNowParcelEvent, makeBoxNowParcelEvent())).toEqual([])
  })

  it('makeBoxNowShipment parses through zBoxNowShipmentDetail, bare and fully populated', () => {
    expect(problems(zBoxNowShipmentDetail, makeBoxNowShipment())).toEqual([])
    expect(problems(zBoxNowShipmentDetail, makeBoxNowShipment({
      parcelId: '9219709201',
      parcelState: 'delivered',
      locker: makeBoxNowLocker(),
      events: [makeBoxNowParcelEvent({ eventType: 'delivered' })],
      labelUrl: '/api/orders/1/boxnow/label',
    }))).toEqual([])
  })
})
