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
 * What this forbids, in both component trees (the frozen webside tree's
 * freeze covers its look, not its behaviour): reading either the old way
 * — a `*_ENABLED` setting key out of the settings payload — or a tenant
 * plan flag (`loyaltyEnabled` and friends). Each one is a second answer
 * that can disagree with Django's, as webside's copies did when they
 * read the raw setting and ignored the plan.
 */
const PLAN_FLAGS = ['loyaltyEnabled', 'blogEnabled', 'promotionsEnabled', 'giftCardsEnabled', 'b2bEnabled', 'recommendationsEnabled']

/**
 * The `*_ENABLED` settings still read from the settings payload, and the
 * only ones that may be. Each is a setting that is not a store feature or
 * preference in Django (`tenant/features.py`); a key added here must be
 * one too.
 */
const PLAIN_BOOLEAN_SETTINGS: Record<string, string> = {
  B2B_INVOICING_ENABLED: 'the checkout invoice option (useCheckoutForm)',
  LOYALTY_TIER_MULTIPLIER_ENABLED: 'a loyalty programme rule (app/utils/loyalty.ts)',
  LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: 'a loyalty programme rule (app/utils/loyalty.ts)',
}

/** A `*_ENABLED` key in any string literal: single, double or template quotes. */
const SETTING_KEY = /['"`]([A-Z0-9_]+_ENABLED)['"`]/g

function sources(dir: string): string[] {
  const root = resolve(REPO, dir)
  return (readdirSync(root, { recursive: true }) as string[])
    .map(entry => resolve(root, entry))
    .filter(file => /\.(ts|vue)$/.test(file))
}

const files = [...sources('app'), ...sources('server'), ...sources('shared').filter(file => !file.includes('openapi'))]
const text = (file: string) => withoutComments(readSource(file))
const label = (file: string) => file.replace(`${REPO}\\`, '').replace(`${REPO}/`, '').replaceAll('\\', '/')

describe('store features and preferences are read from the tenant payload alone', () => {
  it('reads no setting key that is not a plain boolean setting', () => {
    const offenders = files.flatMap(file =>
      [...text(file).matchAll(SETTING_KEY)]
        .map(match => match[1]!)
        .filter(key => !(key in PLAIN_BOOLEAN_SETTINGS))
        .map(key => `${label(file)}: ${key}`))

    expect(offenders).toEqual([])
  })

  it('reads no tenant plan flag', () => {
    const pattern = new RegExp(`\\.(${PLAN_FLAGS.join('|')})\\b`)
    const offenders = files.filter(file => pattern.test(text(file)))

    expect(offenders.map(label)).toEqual([])
  })

  it('covers the frozen webside tree (a canary, so the rule cannot skip it)', () => {
    const reads = files
      .filter(file => file.startsWith(FROZEN))
      .reduce((sum, file) => sum + (text(file).match(/\b(useStoreFeature|useStorePreference)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(25)
  })

  it('is still reading features in many places (a canary, so the rule cannot go blind)', () => {
    const reads = files.reduce((sum, file) => sum + (text(file).match(/\b(useStoreFeature|eventStoreFeature|storeFeatureOn)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(40)
  })

  it('is still reading preferences in many places (a canary, so the rule cannot go blind)', () => {
    const reads = files.reduce((sum, file) => sum + (text(file).match(/\b(useStorePreference|storePreferenceOn|createPreferenceGate)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(15)
  })

  it('still finds the plain boolean settings it allows (a canary for the key pattern)', () => {
    const found = new Set(files.flatMap(file => [...text(file).matchAll(SETTING_KEY)].map(match => match[1]!)))

    expect([...found].sort()).toEqual(Object.keys(PLAIN_BOOLEAN_SETTINGS).sort())
  })
})
