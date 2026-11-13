import { describe, it, expect } from 'vitest'
import { upgradeIconSetting } from '~~/shared/builder/iconUpgrades'

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
