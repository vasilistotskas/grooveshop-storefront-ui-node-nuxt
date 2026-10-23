import { computed, shallowRef } from 'vue'
import type { ComputedRef, ShallowRef } from 'vue'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'

export interface LoyaltySettingsMock {
  /** What the store's settings say: assign `null` for "cannot be read". */
  data: ShallowRef<LoyaltySettings | null>
  /** The value `useLoyaltySettings()` returns. */
  use: ComputedRef<LoyaltySettings | null>
  /** Back to the state the mock was created with — call it in `beforeEach`. */
  reset: () => void
}

/**
 * Stands in for `useLoyaltySettings()` in specs of components that read
 * the programme's figures:
 *
 * ```ts
 * const settings = createLoyaltySettingsMock(makeLoyaltySettings())
 * mockNuxtImport('useLoyaltySettings', () => () => settings.use)
 * beforeEach(() => settings.reset())
 * ```
 *
 * The composable itself is covered by `useLoyaltySettings.spec.ts`
 * against the real settings payload.
 */
export function createLoyaltySettingsMock(initial: LoyaltySettings | null = null): LoyaltySettingsMock {
  const fresh = () => (initial === null ? null : structuredClone(initial))
  const data = shallowRef<LoyaltySettings | null>(fresh())
  return {
    data,
    use: computed(() => data.value),
    reset: () => { data.value = fresh() },
  }
}
