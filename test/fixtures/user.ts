import type { Notification, NotificationUserDetail, UserDetails } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `UserDetails` (the `/api/user/account/{id}` payload) valid against
 * the generated `zUserDetails` (proved by `test/unit/fixtures/user.spec.ts`).
 *
 * Defaults: user 1, active, not staff, no social links, Greek UI.
 * `pk`, `email`, `username` and `uuid` follow `id`. An explicit
 * override wins.
 */
export function makeUserDetails(overrides: Partial<UserDetails> = {}): UserDetails {
  const id = overrides.id ?? 1

  return {
    pk: id,
    id,
    email: `user${id}@example.com`,
    firstName: '',
    lastName: '',
    username: `user${id}`,
    twitter: null,
    linkedin: null,
    facebook: null,
    instagram: null,
    website: null,
    youtube: null,
    github: null,
    languageCode: 'el',
    isActive: true,
    isStaff: false,
    isSuperuser: false,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(17, id),
    mainImagePath: '',
    ...overrides,
  }
}

/** A `NotificationUserDetail`'s overrides; `notification` is itself a partial `Notification`. */
export type NotificationUserDetailOverrides = Partial<Omit<NotificationUserDetail, 'notification'>> & {
  notification?: Partial<Notification>
}

/**
 * A `NotificationUserDetail` (one row of the user's notification list)
 * valid against the generated `zNotificationUserDetail` (proved by
 * `test/unit/fixtures/user.spec.ts`).
 *
 * Defaults: row 1, unseen, for `makeUserDetails()`, carrying a
 * notification with an `el` and `en` title. The notification's `id`
 * (and so its `uuid`) follows the row's `id` unless its own overrides
 * say otherwise.
 */
export function makeNotificationUserDetail(
  overrides: NotificationUserDetailOverrides = {},
): NotificationUserDetail {
  const { notification: notificationOverrides, ...rest } = overrides
  const id = rest.id ?? 1
  const notificationId = notificationOverrides?.id ?? id

  return {
    id,
    user: makeUserDetails(),
    notification: {
      translations: {
        el: { title: `Ειδοποίηση ${notificationId}`, message: '' },
        en: { title: `Notification ${notificationId}`, message: '' },
      },
      id: notificationId,
      link: null,
      expiryDate: null,
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
      uuid: fixtureUuid(18, notificationId),
      ...notificationOverrides,
    },
    seen: false,
    seenAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(19, id),
    ...rest,
  }
}
