import { describe, it, expect } from 'vitest'
import { COMPONENTS, FROZEN, boundAttribute, classesOf, readSource, relativeLabel, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

/**
 * Whatever is fixed to the bottom of the screen takes its offset from
 * the bottom dock (`--dock-*` in `app/assets/css/main.css`), never from a
 * number of its own.
 *
 * Each element used to hard-code it: the tab bar at `0.75rem`, the
 * sticky bars at `5.5rem` "above the tab bar", the assistant at
 * `bottom-24`. None knew the others, so on a phone the assistant sat on
 * the sticky add-to-cart button, and with an iPhone's home-indicator
 * inset it overlapped the tab bar (owner review, 2026-10-16).
 *
 * Not covered:
 * - the dock's edges rather than its layers: the floating funding strip
 *   (the bottom edge itself, `bottom-0`) and the cookie notice (a
 *   transient overlay above everything);
 * - webside's own chrome, which lives outside `variants/webside` but is
 *   registered only for it (`chrome:assistant@webside`,
 *   `chrome:cookie_consent@webside` in `app/utils/variantRegistry.ts`)
 *   and stays as frozen as the rest of that tree.
 */
const EDGES = new Set([
  'Chrome/FundingBanner.vue',
  'Chrome/CookieConsent.vue',
  'Chat/Widget.vue',
  'Cookie/Control.vue',
])

const FIXED = /(^|[\s'"`])fixed(?=[\s'"`]|$)/
const BOTTOM = /(^|[\s'"`:])bottom-(?!0(?=[\s'"`]|$))\S+/

function hardCodedBottoms(file: string): string[] {
  const label = relativeLabel(COMPONENTS, file)
  if (EDGES.has(label)) return []
  const out: string[] = []
  walkElements(sfcTemplate(file), (node) => {
    for (const classes of [classesOf(node), boundAttribute(node, 'ui') ?? '']) {
      if (!FIXED.test(classes)) continue
      const bottoms = classes.match(new RegExp(BOTTOM, 'g')) ?? []
      for (const bottom of bottoms) {
        if (!bottom.includes('--dock-')) out.push(`${label}:${node.loc.start.line}: ${bottom.trim()}`)
      }
    }
  })
  return out
}

describe('fixed bottom elements stack through the bottom dock', () => {
  const files = vueFiles(COMPONENTS, { exclude: [FROZEN] })

  it('finds the docked elements', () => {
    // The tab bar, both sticky bars and the two corner buttons: a rule
    // that matched none of them would pass for the wrong reason.
    const docked = files.filter(file => readSource(file).includes('--dock-'))
    expect(docked.map(file => relativeLabel(COMPONENTS, file))).toEqual(expect.arrayContaining([
      'Cart/ActionBar.vue',
      'Chrome/AccessibilityToolbar.vue',
      'Chrome/Assistant.vue',
      'MobileBottomNav.vue',
      'Storefront/ProductDetail.vue',
    ]))
  })

  it('takes every bottom offset from the dock', () => {
    expect(files.flatMap(hardCodedBottoms)).toEqual([])
  })
})
