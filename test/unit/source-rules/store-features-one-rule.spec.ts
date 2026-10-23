import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FROZEN, REPO, readSource, withoutComments } from '../../helpers/sourceText'

/**
 * A store feature has ONE answer: `TenantConfig.features`, read through
 * `useStoreFeature` / `eventStoreFeature` / `storeFeatureOn`. A store
 * preference likewise: `TenantConfig.preferences`, read through
 * `useStorePreference` / `storePreferenceOn`.
 *
 * What this forbids outside the frozen webside tree: reading either the
 * old way — a literal `*_ENABLED` key through `useSettingFlag` /
 * `settingEnabled` — or a tenant plan flag (`tenantStore.loyaltyEnabled`
 * and friends) combined with a setting. Each one is a second answer that
 * can disagree with Django's.
 */
const PLAN_FLAGS = ['loyaltyEnabled', 'blogEnabled', 'promotionsEnabled', 'giftCardsEnabled', 'b2bEnabled', 'recommendationsEnabled']

function sources(dir: string): string[] {
  const root = resolve(REPO, dir)
  return (readdirSync(root, { recursive: true }) as string[])
    .map(entry => resolve(root, entry))
    .filter(file => /\.(ts|vue)$/.test(file) && !file.startsWith(FROZEN))
}

const files = [...sources('app'), ...sources('server'), ...sources('shared').filter(file => !file.includes('openapi'))]
const text = (file: string) => withoutComments(readSource(file))
const label = (file: string) => file.replace(`${REPO}\\`, '').replace(`${REPO}/`, '').replaceAll('\\', '/')

describe('store features and preferences are read from the tenant payload alone', () => {
  it('reads no feature through a literal setting key', () => {
    const offenders = files.filter(file => /\b(useSettingFlag|settingEnabled)\(\s*'[A-Z_]+_ENABLED'/.test(text(file)))

    expect(offenders.map(label)).toEqual([])
  })

  it('reads no tenant plan flag outside the frozen webside tree', () => {
    const pattern = new RegExp(`\\.(${PLAN_FLAGS.join('|')})\\b`)
    const offenders = files
      // The store itself defines them for the frozen tree; the generated
      // payload type and the Zod schema name them as fields.
      .filter(file => !label(file).endsWith('app/stores/tenant.ts'))
      .filter(file => pattern.test(text(file)))

    expect(offenders.map(label)).toEqual([])
  })

  it('is still reading features in many places (a canary, so the rule cannot go blind)', () => {
    const reads = files.reduce((sum, file) => sum + (text(file).match(/\b(useStoreFeature|eventStoreFeature|storeFeatureOn)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(40)
  })

  it('is still reading preferences in many places (a canary, so the rule cannot go blind)', () => {
    const reads = files.reduce((sum, file) => sum + (text(file).match(/\b(useStorePreference|storePreferenceOn|createPreferenceGate)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(15)
  })
})
