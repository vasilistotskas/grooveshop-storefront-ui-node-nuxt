import { describe, it, expect } from 'vitest'
import { upgradeIconSetting } from '~~/shared/builder/iconUpgrades'
import trustBadge from '~~/app/blocks/trust_badge.block'
import { upgradeNode } from '~~/shared/builder/upgrade'

/**
 * The step that brought each icon setting onto the builder's list
 * (`BUILDER_ICONS`): the cases Django's port is held to are in
 * `test/fixtures/builder/upgrade-cases.json`; these are the step alone.
 */
describe('upgradeIconSetting', () => {
  it('writes a saved icon as its entry, and keeps the other settings', () => {
    expect(upgradeIconSetting({ settings: { label: 'Βοήθεια', icon: 'i-lucide:shield' } })).toEqual({ settings: { label: 'Βοήθεια', icon: 'i-lucide-shield' } })
  })

  it('leaves out an icon the list does not hold', () => {
    expect(upgradeIconSetting({ settings: { label: 'Βοήθεια', icon: 'i-lucide-star' } })).toEqual({ settings: { label: 'Βοήθεια' } })
  })

  it('leaves a node without an icon as it is', () => {
    expect(upgradeIconSetting({ settings: { label: 'Βοήθεια' } })).toEqual({ settings: { label: 'Βοήθεια' } })
  })
})

/**
 * A trust badge needs a mark (an image, an image URL or an icon): when the
 * icon left out was its only one, the badge's preset icon takes its place,
 * and the badge still passes its block's rule rather than being left off the
 * page (PR 475 review).
 */
describe('the trust badge’s icon upgrade', () => {
  const upgrade = ({ settings }: { settings: Record<string, unknown> }) => upgradeNode({ type: 'trust_badge@1', settings }, trustBadge)

  it('gives a badge whose only mark was an icon off the list its preset icon, and the badge passes its rule', () => {
    const upgraded = upgrade({ settings: { kind: 'custom', label: 'Εγγύηση', icon: 'i-lucide-star' } })

    expect(upgraded.settings).toEqual({ kind: 'custom', label: 'Εγγύηση', icon: 'i-lucide-shield-check' })
    expect(trustBadge.schema.safeParse(upgraded.settings).success).toBe(true)
  })

  it('only leaves out an icon off the list when the badge has a logo too', () => {
    const upgraded = upgrade({ settings: { kind: 'payment', label: 'Visa', imageUrl: 'https://example.test/visa.svg', icon: 'i-lucide-star' } })

    expect(upgraded.settings).toEqual({ kind: 'payment', label: 'Visa', imageUrl: 'https://example.test/visa.svg' })
  })

  it('keeps a listed icon as it is', () => {
    expect(upgrade({ settings: { kind: 'shipping', label: 'ACS', icon: 'i-heroicons-truck' } }).settings).toEqual({ kind: 'shipping', label: 'ACS', icon: 'i-heroicons-truck' })
  })
})
