import type { GiftCard } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `GiftCard` (one row of `/api/giftcard/mine`) valid against the
 * generated `zGiftCard` (proved by `test/unit/fixtures/giftCard.spec.ts`).
 *
 * Defaults: card 1, an active €50 card never used (balance = initial
 * value), with no expiry, issued on `FIXTURE_TIMESTAMP`. `uuid` and
 * `code` follow `id`.
 */
export function makeGiftCard(overrides: Partial<GiftCard> = {}): GiftCard {
  const id = overrides.id ?? 1

  return {
    id,
    uuid: fixtureUuid(25, id),
    code: `GC-TEST-${String(id).padStart(4, '0')}`,
    initialValue: 50,
    balance: 50,
    status: 'ACTIVE',
    expiresAt: null,
    recipientEmail: 'shopper@example.com',
    recipientName: 'Δήμος Δοκιμής',
    senderName: 'Μαρία',
    message: '',
    deliveredAt: FIXTURE_TIMESTAMP,
    transactions: [],
    createdAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}
