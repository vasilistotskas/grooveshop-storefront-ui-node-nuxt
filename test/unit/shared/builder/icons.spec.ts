import { describe, it, expect } from 'vitest'
import { BUILDER_ICONS, BUILDER_ICON_SETS, builderIconBundleName, builderIconOf } from '~~/shared/builder/icons'
import { builderField } from '~~/shared/builder/fields'

/**
 * The one list of the icons the builder offers. Every icon setting is that
 * list (`builderField.icon()`; `labels.spec.ts` holds each entry named in
 * both languages), each entry has the name the icon bundle reads, and a
 * name a store saved with a colon, `i-<set>:<name>`, finds its entry.
 */

/**
 * Every icon the three production stores had published on 2026-11-13, read
 * from Django's public `builder/published` of webside, demo and fyteia, and
 * the shield the staging home picked: the list must hold each, or its node
 * would lose its icon on upgrade.
 */
const PUBLISHED_2026_11_13 = [
  'i-heroicons-arrow-uturn-left',
  'i-heroicons-briefcase',
  'i-heroicons-building-storefront',
  'i-heroicons-chat-bubble-left-right',
  'i-heroicons-information-circle',
  'i-heroicons-lifebuoy',
  'i-heroicons-light-bulb',
  'i-heroicons-lock-closed',
  'i-heroicons-rectangle-group',
  'i-heroicons-shield-check',
  'i-heroicons-shopping-bag',
  'i-heroicons-sparkles',
  'i-heroicons-truck',
  'i-lucide-shield',
]

describe('BUILDER_ICONS', () => {
  it('is the only thing an icon setting takes', () => {
    expect(builderField.icon().options).toEqual(BUILDER_ICONS)
    expect(builderField.icon().safeParse('i-lucide-star').success).toBe(false)
    expect(builderField.icon().safeParse('i-lucide:shield').success).toBe(false)
  })

  it('holds every icon the stores had published, as they saved it', () => {
    expect(PUBLISHED_2026_11_13.filter(name => !BUILDER_ICONS.some(icon => icon === name))).toEqual([])
  })

  it('holds each icon once, from one of its sets', () => {
    expect(new Set(BUILDER_ICONS).size).toBe(BUILDER_ICONS.length)
    for (const icon of BUILDER_ICONS) expect(BUILDER_ICON_SETS.some(set => icon.startsWith(`i-${set}-`))).toBe(true)
  })
})

describe('builderIconBundleName', () => {
  // The bundle splits at the colon: a set with a hyphen in its name must keep it.
  it.each([
    ['i-lucide-shield-check', 'i-lucide:shield-check'],
    ['i-heroicons-chat-bubble-left-right', 'i-heroicons:chat-bubble-left-right'],
    ['i-fa6-solid-network-wired', 'i-fa6-solid:network-wired'],
  ] as const)('names %s as %s', (icon, bundled) => {
    expect(builderIconBundleName(icon)).toBe(bundled)
  })
})

describe('builderIconOf', () => {
  it.each([
    ['i-lucide-shield', 'i-lucide-shield'],
    ['i-lucide:shield', 'i-lucide-shield'],
    ['i-heroicons:chat-bubble-left-right', 'i-heroicons-chat-bubble-left-right'],
    ['i-fa6-solid:shield', 'i-fa6-solid-shield'],
    ['i-lucide-star', undefined],
  ])('reads %s as %s', (name, entry) => {
    expect(builderIconOf(name)).toBe(entry)
  })
})
