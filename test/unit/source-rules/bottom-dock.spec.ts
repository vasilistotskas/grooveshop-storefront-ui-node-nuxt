import { describe, it, expect } from 'vitest'
import { COMPONENTS, boundAttribute, classesOf, readSource, relativeLabel, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

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
 * Every design, webside's included: its tab bar and sticky add-to-cart
 * bar dock edge to edge (`data-dock-flush`), and its assistant and cookie
 * notice (`chrome:assistant@webside`, `chrome:cookie_consent@webside` in
 * `app/utils/variantRegistry.ts`) stack on them. Between 768 and 1023px
 * its tab bar used to cover its sticky bar, each with a number of its own.
 *
 * Not covered: the dock's edges rather than its layers, the floating
 * funding strip (the bottom edge itself, `bottom-0`) and the default
 * design's cookie notice (a transient overlay above everything).
 */
const EDGES = new Set([
  'Chrome/FundingBanner.vue',
  'Chrome/CookieConsent.vue',
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
  const files = vueFiles(COMPONENTS)

  it('finds the docked elements', () => {
    // Both designs' tab bars and product sticky bars, the cart's bar, the
    // corner buttons and webside's cookie notice: a rule that matched none
    // of them would pass for the wrong reason.
    const docked = files.filter(file => readSource(file).includes('--dock-'))
    expect(docked.map(file => relativeLabel(COMPONENTS, file))).toEqual(expect.arrayContaining([
      'Cart/ActionBar.vue',
      'Chrome/AccessibilityToolbar.vue',
      'Chrome/Assistant.vue',
      'MobileBottomNav.vue',
      'Storefront/ProductDetail.vue',
      'variants/webside/MobileBottomNav.vue',
      'variants/webside/Storefront/ProductDetail.vue',
      'Chat/Widget.vue',
      'Cookie/Control.vue',
    ]))
  })

  it('takes every bottom offset from the dock', () => {
    expect(files.flatMap(hardCodedBottoms)).toEqual([])
  })
})
