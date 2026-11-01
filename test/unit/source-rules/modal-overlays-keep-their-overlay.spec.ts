import { describe, it, expect } from 'vitest'
import { APP, appLabel, boundAttribute, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'

/**
 * A modal overlay keeps its overlay.
 *
 * reka-ui's modal dialog content (under `UModal`, `USlideover` and
 * `UDrawer`) used to block taps outside it by writing
 * `pointer-events: none` on `<body>`. Every element on the page inherits
 * that property, so opening any overlay restyled the whole page,
 * synchronously, inside the tap: 300-440 ms of a phone menu's 750-880 ms
 * on a 6x-slowed CPU, in both designs (2026-11-01). The project's reka-ui
 * patch turns that write off for modal dialogs
 * (`patches/reka-ui@2.11.0.patch`, `DialogContentModal`).
 *
 * That is safe only because each of these overlays renders its overlay,
 * a full-viewport layer under the content. A tap outside the content
 * lands on the overlay, which reka reads as a tap outside and closes the
 * dialog, and nothing on the page underneath receives it. An overlay
 * with `:overlay="false"` would let that tap reach the page, so it is not
 * allowed.
 */

const MODAL_OVERLAYS = new Set(['UModal', 'USlideover', 'UDrawer'])

describe('modal overlays', () => {
  it('never turn their overlay off', () => {
    const offenders: string[] = []
    let seen = 0
    for (const file of vueFiles(APP)) {
      walkElements(sfcTemplate(file), (node) => {
        if (!MODAL_OVERLAYS.has(node.tag)) return
        seen++
        const bound = boundAttribute(node, 'overlay')
        const staticFalse = node.props.some(prop => prop.type === 6 && prop.name === 'overlay' && prop.value?.content === 'false')
        if (staticFalse || (bound !== undefined && bound.trim() !== 'true')) {
          offenders.push(`${appLabel(file)}:${node.loc.start.line} <${node.tag}> overlay=${bound ?? 'false'}`)
        }
      })
    }
    // Both designs' menus, dialogs and drawers were read, not nothing.
    expect(seen).toBeGreaterThan(20)
    expect(offenders).toEqual([])
  })
})
