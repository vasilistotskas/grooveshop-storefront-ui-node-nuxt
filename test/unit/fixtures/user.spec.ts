import { describe, expect, it } from 'vitest'

import { zNotificationUserDetail, zUserDetails } from '~~/shared/openapi/zod.gen'
import { makeNotificationUserDetail, makeUserDetails } from '~~/test/fixtures/user'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makeUserDetails` / `makeNotificationUserDetail` replace the
 * `{ id, email } as UserDetails` and `{ id, notification: { id } } as
 * NotificationUserDetail` literals the store specs built. Parsed
 * strictly, so a stale key fails here and names itself.
 */
describe('makeUserDetails', () => {
  it('builds a default user that parses through zUserDetails', () => {
    expect(problems(zUserDetails, makeUserDetails())).toEqual([])
  })

  it('derives pk, email and uuid from the id', () => {
    const user = makeUserDetails({ id: 7 })

    expect(problems(zUserDetails, user)).toEqual([])
    expect(user).toMatchObject({ id: 7, pk: 7, email: 'user7@example.com' })
    expect(user.uuid).not.toBe(makeUserDetails().uuid)
  })
})

describe('makeNotificationUserDetail', () => {
  it('builds a default row that parses through zNotificationUserDetail', () => {
    expect(problems(zNotificationUserDetail, makeNotificationUserDetail())).toEqual([])
  })

  it('nests notification overrides and follows the row id', () => {
    const row = makeNotificationUserDetail({ id: 3, seen: true, notification: { link: '/orders/1' } })

    expect(problems(zNotificationUserDetail, row)).toEqual([])
    expect(row).toMatchObject({ id: 3, seen: true, notification: { id: 3, link: '/orders/1' } })
  })
})
