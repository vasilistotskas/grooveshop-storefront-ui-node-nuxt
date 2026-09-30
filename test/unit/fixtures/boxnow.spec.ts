import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { zBoxNowLocker, zBoxNowParcelEvent, zBoxNowShipmentDetail } from '~~/shared/openapi/zod.gen'
import { parseBoxNowSelectedLocker } from '~~/shared/utils/boxnow-widget'
import {
  boxNowWidgetMessage,
  makeBoxNowLocker,
  makeBoxNowParcelEvent,
  makeBoxNowSelectedLocker,
  makeBoxNowShipment,
} from '~~/test/fixtures/boxnow'

/**
 * The Django payloads parse strictly through their generated schemas; the
 * widget message has no schema, so it is checked against the parser the
 * picker runs on every `postMessage` — a fixture the parser rejects would
 * make every "selects a locker" test a test of the rejection path.
 */
function problems(schema: z.ZodObject, value: unknown): string[] {
  const result = schema.strict().safeParse(value)
  return result.success
    ? []
    : result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
}

describe('BoxNow fixtures', () => {
  it('the widget message parses into exactly the selected-locker fixture', () => {
    expect(parseBoxNowSelectedLocker(boxNowWidgetMessage())).toEqual(makeBoxNowSelectedLocker())
  })

  it('a Cypriot widget message parses as a Cypriot locker', () => {
    const parsed = parseBoxNowSelectedLocker(boxNowWidgetMessage({ boxnowCountry: 'CY' }))

    expect(parsed?.boxnowLockerCountryCode).toBe('CY')
  })

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
