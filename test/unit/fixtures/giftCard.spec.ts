import { describe, expect, it } from 'vitest'

import { zGiftCard } from '~~/shared/openapi/zod.gen'
import { makeGiftCard } from '~~/test/fixtures/giftCard'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/** `makeGiftCard` parses strictly, so a stale key fails here and names itself. */
describe('gift card fixtures', () => {
  it.each([
    ['makeGiftCard', makeGiftCard()],
    ['makeGiftCard, part-spent and expiring', makeGiftCard({ id: 2, balance: 12.5, expiresAt: '2027-01-01T00:00:00Z' })],
    ['makeGiftCard, disabled', makeGiftCard({ id: 3, status: 'DISABLED' })],
  ] as const)('%s parses strictly', (_name, value) => {
    expect(problems(zGiftCard, value)).toEqual([])
  })

  it('gives two cards distinct uuids and codes', () => {
    const [one, two] = [makeGiftCard(), makeGiftCard({ id: 2 })]

    expect(two.uuid).not.toBe(one.uuid)
    expect(two.code).not.toBe(one.code)
  })
})
