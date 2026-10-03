import { describe, expect, it } from 'vitest'

import { zBusinessProfile } from '~~/shared/openapi/zod.gen'
import { makeBusinessProfile } from '~~/test/fixtures/business'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/** `makeBusinessProfile` parses strictly, so a stale key fails here and names itself. */
describe('business fixtures', () => {
  it.each([
    ['makeBusinessProfile', makeBusinessProfile()],
    ['makeBusinessProfile, pending review', makeBusinessProfile({ status: 'PENDING', viesStatus: 'UNCHECKED', viesCheckedAt: null, customerGroupName: null })],
  ] as const)('%s parses strictly', (_name, value) => {
    expect(problems(zBusinessProfile, value)).toEqual([])
  })
})
