import type { PayWay } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `PayWay` as Django serialises it, valid against the generated
 * `zPayWay` (proved by `test/unit/fixtures/payWay.spec.ts`).
 *
 * Defaults: id 1, active, free cash on delivery (key `PAY_ON_DELIVERY`) — the pay way Django
 * seeds first (`pay_way/migrations/0019_seed_default_pay_ways.py`:
 * provider `cash_on_delivery`, settled with the courier). `uuid` follows
 * `id`.
 *
 * `settlement` is the authoritative discriminator; the deprecated
 * `isOnlinePayment` / `requiresConfirmation` mirrors are derived from it
 * as Django derives them, so an online pay way is
 * `makePayWay({ providerCode: 'stripe', settlement: 'online' })`. An
 * explicit override of a mirror wins.
 */
export function makePayWay(overrides: Partial<PayWay> = {}): PayWay {
  const id = overrides.id ?? 1
  const settlement = overrides.settlement ?? 'courier_cash'

  return {
    translations: {
      el: { description: '', instructions: '' },
      en: { description: '', instructions: '' },
    },
    id,
    key: 'PAY_ON_DELIVERY',
    active: true,
    cost: 0,
    freeThreshold: 0,
    icon: null,
    sortOrder: id,
    mainImagePath: '',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(4, id),
    iconFilename: '',
    providerCode: 'cash_on_delivery',
    settlement,
    isOnlinePayment: settlement === 'online',
    requiresConfirmation: settlement === 'offline_transfer',
    ...overrides,
  }
}
