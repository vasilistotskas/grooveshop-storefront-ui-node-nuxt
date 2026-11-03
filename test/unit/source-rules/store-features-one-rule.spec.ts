import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WEBSIDE_DESIGN, REPO, readSource, withoutComments } from '../../helpers/sourceText'

/**
 * A store feature has ONE answer: `TenantConfig.features`, read through
 * `useStoreFeature` / `eventStoreFeature` / `storeFeatureOn` (the cart and
 * the catalogue included). A store preference, a presentation switch
 * (`mobileBottomNav`, `stickyAddToCart`, `recentlyViewed`, `demoAccount`),
 * likewise: `TenantConfig.preferences`, read through `useStorePreference` /
 * `storePreferenceOn`.
 *
 * What this forbids, in both designs (a design is presentation only, so
 * its look is its own but its behaviour follows the platform): reading either the old way
 * — a `*_ENABLED` setting key — or a tenant
 * plan flag (`loyaltyEnabled` and friends). Each one is a second answer
 * that can disagree with Django's, as webside's copies did when they
 * read the raw setting and ignored the plan.
 */
const PLAN_FLAGS = ['loyaltyEnabled', 'blogEnabled', 'promotionsEnabled', 'giftCardsEnabled', 'b2bEnabled', 'recommendationsEnabled']

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
  it('reads no `*_ENABLED` setting key', () => {
    const offenders = files.flatMap(file =>
      [...text(file).matchAll(SETTING_KEY)].map(match => `${label(file)}: ${match[1]}`))

    expect(offenders).toEqual([])
  })

  it('reads no tenant plan flag', () => {
    const pattern = new RegExp(`\\.(${PLAN_FLAGS.join('|')})\\b`)
    const offenders = files.filter(file => pattern.test(text(file)))

    expect(offenders.map(label)).toEqual([])
  })

  it('covers the webside tree (a canary, so the rule cannot skip it)', () => {
    const reads = files
      .filter(file => file.startsWith(WEBSIDE_DESIGN))
      .reduce((sum, file) => sum + (text(file).match(/\b(useStoreFeature|useStorePreference)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(25)
  })

  it('is still reading features in many places (a canary, so the rule cannot go blind)', () => {
    const reads = files.reduce((sum, file) => sum + (text(file).match(/\b(useStoreFeature|eventStoreFeature|storeFeatureOn)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(40)
  })

  it('is still reading preferences in many places (a canary, so the rule cannot go blind)', () => {
    const reads = files.reduce((sum, file) => sum + (text(file).match(/\b(useStorePreference|storePreferenceOn)\(/g)?.length ?? 0), 0)

    expect(reads).toBeGreaterThan(8)
  })

  it('reads the cart and the catalogue as features, never as preferences', () => {
    const pattern = /\b(useStorePreference|storePreferenceOn)\([^)]*['"](cart|catalogue)['"]|createPreferenceGate|preferences\??\.(cart|catalogue)\b/
    const offenders = files.filter(file => pattern.test(text(file)))

    expect(offenders.map(label)).toEqual([])
  })
})
