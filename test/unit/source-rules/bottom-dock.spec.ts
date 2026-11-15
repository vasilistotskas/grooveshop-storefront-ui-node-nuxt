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

/**
 * An edge-to-edge bar (`data-dock-flush`) has no gap: the bottom-most one
 * stands on the screen's edge, or on the floating funding strip
 * (`--dock-edge`), and pads the rest of the bottom inset inside itself,
 * so no page shows under an iPhone's home indicator. The sticky bar
 * stands on the tab bar when there is one: `--dock-floor` and
 * `--dock-floor-pad` (`app/assets/css/main.css`) are the tab bar's top
 * and 0 then, the edge and the rest of the inset otherwise. Standing on
 * `--dock-inset` instead left webside's sticky bar 34px up an iPhone with
 * the page scrolling under it.
 */
const FLUSH_FOOTING = {
  tabbar: ['bottom-(--dock-edge)', 'pb-[calc(var(--dock-inset)-var(--dock-edge))]'],
  bar: ['bottom-(--dock-floor)', 'pb-(--dock-floor-pad)'],
} as const

function flushFootings(file: string): Array<{ at: string, kind: keyof typeof FLUSH_FOOTING, classes: string[] }> {
  const out: Array<{ at: string, kind: keyof typeof FLUSH_FOOTING, classes: string[] }> = []
  walkElements(sfcTemplate(file), (node) => {
    if (!node.props.some(prop => prop.type === 6 && prop.name === 'data-dock-flush')) return
    const dock = node.props.find(prop => prop.type === 6 && prop.name === 'data-dock')
    const kind = (dock?.type === 6 ? dock.value?.content : boundAttribute(node, 'data-dock'))?.includes('tabbar') ? 'tabbar' : 'bar'
    const classes = `${classesOf(node)} ${boundAttribute(node, 'ui') ?? ''}`.split(/[\s`'"]+/)
    out.push({ at: `${relativeLabel(COMPONENTS, file)}:${node.loc.start.line}`, kind, classes })
  })
  return out
}

describe('an edge-to-edge bar stands on the edge, or on the tab bar, and pads the inset', () => {
  const flush = vueFiles(COMPONENTS).flatMap(flushFootings)

  it('finds webside\'s tab bar and sticky bar', () => {
    expect(flush.map(({ at, kind }) => [at.split(':')[0], kind])).toEqual(expect.arrayContaining([
      ['variants/webside/MobileBottomNav.vue', 'tabbar'],
      ['variants/webside/Storefront/ProductDetail.vue', 'bar'],
    ]))
  })

  it.each(['tabbar', 'bar'] as const)('every flush %s takes its footing from the dock', (kind) => {
    const wrong = flush
      .filter(element => element.kind === kind)
      .filter(element => !FLUSH_FOOTING[kind].every(footing => element.classes.includes(footing)))
      .map(element => element.at)

    expect(wrong).toEqual([])
  })
})

/**
 * A docked element that caps its height to the screen takes its own
 * offset off that cap: the assistant's panel kept a cap tuned to a fixed
 * `bottom-36` after its offset began to grow with the dock, and with the
 * tab bar and the sticky bar showing its header went above the screen.
 */
const DOCK_VAR = /--dock-[a-z]+/

function capsWithoutOffset(file: string): string[] {
  const out: string[] = []
  walkElements(sfcTemplate(file), (node) => {
    const named = [classesOf(node), boundAttribute(node, 'ui') ?? ''].join(' ')
    if (!FIXED.test(named)) return
    const offset = (named.match(new RegExp(BOTTOM, 'g')) ?? []).join(' ').match(DOCK_VAR)?.[0]
    if (!offset) return
    const caps = [...(named.match(/max-h-\S*100dvh\S*/g) ?? []), boundAttribute(node, 'style') ?? '']
      .filter(cap => cap.includes('100dvh'))
    for (const cap of caps) {
      if (!cap.includes(`var(${offset})`)) out.push(`${relativeLabel(COMPONENTS, file)}:${node.loc.start.line}: ${offset}`)
    }
  })
  return out
}

describe('a docked element that caps its height leaves room for its offset', () => {
  const files = vueFiles(COMPONENTS)

  it('finds the capped ones', () => {
    // The assistant's panel and webside's cookie notice.
    const capped = files.filter(file => /100dvh/.test(readSource(file)) && /--dock-/.test(readSource(file)))
    expect(capped.map(file => relativeLabel(COMPONENTS, file))).toEqual(expect.arrayContaining(['Chat/Widget.vue', 'Cookie/Control.vue']))
  })

  it('subtracts the offset it stands on', () => {
    expect(files.flatMap(capsWithoutOffset)).toEqual([])
  })
})
