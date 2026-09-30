import { resolve } from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'
import {
  APP,
  COMPONENTS,
  FROZEN,
  appLabel,
  boundAttribute,
  classesOf,
  parseSfc,
  sfcTemplate,
  vueFiles,
  walkElements,
  withoutComments,
} from '../../helpers/sourceText'

/**
 * Nothing may hang past its box SIDEWAYS without an ancestor clipping it.
 *
 * An absolutely positioned element with a negative horizontal inset sits
 * outside its containing block on purpose. If no ancestor clips the
 * overflow it does not merely paint outside — it makes the DOCUMENT
 * wider, and the whole page scrolls sideways. Three instances of this
 * shipped before the rule existed:
 *
 *   - a decorative orb at `-right-20` in `MediaText` scrolled a 390px
 *     phone to 454px on fyteia;
 *   - carousel arrows at `sm:-start-12`/`sm:-end-12` scrolled the
 *     product rails by 24px at 1440;
 *   - the notifications panel at `lg:-right-12` reached past a 32px
 *     container gutter.
 *
 * Only the horizontal axis is checked: `-top-24` on its own cannot widen
 * a page, and demanding a clip for it would push authors into hiding
 * decoration that is doing no harm. Tailwind 4.3 canonicalises
 * `-start-*`/`-end-*` to `-inset-s-*`/`-inset-e-*`, so both spellings
 * count.
 *
 * A parent COMPONENT's clipping does not count. The check cannot see
 * through a component boundary, and relying on one is fragile anyway —
 * whoever mounts this component is free to change. A section that hangs
 * something outside its own box clips it itself.
 *
 * The frozen `variants/webside` tree is exempt: its overflow is the
 * render that store has today, and the freeze is byte-identical on
 * purpose. The live `variants/delta_sigma` trees are checked.
 */
const FILES = [
  ...vueFiles(COMPONENTS, { exclude: [FROZEN] }),
  ...vueFiles(resolve(APP, 'layouts')),
]

/**
 * Class lists arrive as one blob of template source, so a class is
 * recognised by what can precede it: the start, whitespace, a quote or
 * a breakpoint/state colon (`lg:-right-12`).
 */
const EDGE = '(?:^|[\\s\'"`:\\[])'
const TAKEN_OUT_OF_FLOW = new RegExp(`${EDGE}(?:absolute|fixed)(?:$|[\\s'"\`])`)
const HANGS_SIDEWAYS = new RegExp(`${EDGE}-(?:left|right|start|end|inset-[xse]|inset)-(?:[0-9]|px|full|\\[)`)
const CLIPS = new RegExp(`${EDGE}overflow-(?:hidden|clip|x-hidden|x-clip)(?:$|[\\s'"\`])`)

let clippedOverhangs = 0
let unclipped: string[]
let throughUi: string[]

beforeAll(() => {
  unclipped = []
  throughUi = []
  for (const file of FILES) {
    const label = appLabel(file)

    walkElements(sfcTemplate(file), (node, ancestors) => {
      const classes = classesOf(node)
      if (!TAKEN_OUT_OF_FLOW.test(classes) || !HANGS_SIDEWAYS.test(classes)) return
      if (ancestors.some(ancestor => CLIPS.test(classesOf(ancestor)))) clippedOverhangs++
      else unclipped.push(`${label}: ${classes}`)
    })

    // Comments legitimately NAME the classes this rule forbids — two
    // carousels carry a note about the arrows that used to sit at
    // `sm:-start-12` — so they are blanked before anything is matched.
    const descriptor = parseSfc(file)
    const sources = [descriptor.script?.content ?? '', descriptor.scriptSetup?.content ?? '']
    walkElements(sfcTemplate(file), (node) => {
      const ui = boundAttribute(node, 'ui')
      if (ui) sources.push(ui)
    })
    for (const source of sources) {
      const hit = withoutComments(source).match(HANGS_SIDEWAYS)
      if (hit) throughUi.push(`${label}: a ui slot positions something at ${hit[0].trim()}`)
    }
  }
})

describe('elements that hang past their box sideways', () => {
  it('are clipped by an ancestor element in the same template', () => {
    expect(unclipped, 'these hang outside their box horizontally with nothing clipping them, which widens the document').toEqual([])
  })

  it('are still found where they are clipped legitimately', () => {
    // A rule matching nothing passes forever.
    expect(clippedOverhangs).toBeGreaterThanOrEqual(5)
  })

  /**
   * A `ui` slot class lands on markup a LIBRARY component renders, so
   * nothing here can tell whether it ends up inside that component's
   * clipped viewport or beside it. It went wrong the one time it was
   * tried: the carousel arrows at `sm:-start-12`/`sm:-end-12` sat
   * outside the rail and scrolled the page by 24px at 1440. Position
   * such controls on the rail's own edge instead.
   */
  it('are not positioned outside a library component through its ui slots', () => {
    expect(throughUi, 'these push a library component\'s own markup outside it, where nothing in this file can clip it').toEqual([])
  })
})
