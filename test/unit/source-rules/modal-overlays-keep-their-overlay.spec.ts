import { describe, it, expect, beforeAll } from 'vitest'
import { APP, appLabel, boundAttribute, sfcTemplate, vueFiles, walkElements } from '../../helpers/sourceText'
import type { ElementNode } from '../../helpers/sourceText'

/**
 * A modal overlay keeps its overlay.
 *
 * reka-ui's modal dialogs (under `UModal`, `USlideover` and `UDrawer`)
 * blocked taps outside them by writing `pointer-events: none` on `<body>`,
 * from two places: the dialog content's dismissable layer and the
 * overlay's scroll lock. Every element on the page inherits that property,
 * so opening an overlay restyled the whole page, synchronously, inside the
 * tap: 300-440 ms of a phone menu's 750-880 ms on a 6x-slowed CPU, in both
 * designs (2026-11-01). The project's reka-ui patch
 * (`patches/reka-ui@2.11.0.patch`) stops both writes for dialogs.
 *
 * That is safe only because each of these overlays renders its overlay,
 * a full-viewport layer under the content. A tap outside the content lands
 * on the overlay, which reka reads as a tap outside and closes the dialog,
 * and nothing on the page underneath receives it. An overlay with
 * `:overlay="false"` would let that tap reach the page, so it is not
 * allowed. `test/nuxt/components/DialogBodyPointerEvents.spec.ts` checks
 * the patched behaviour itself.
 */

const MODAL_OVERLAYS = new Set(['UModal', 'USlideover', 'UDrawer'])

interface Site { label: string, node: ElementNode }

let sites: Site[]

beforeAll(() => {
  sites = []
  for (const file of vueFiles(APP)) {
    walkElements(sfcTemplate(file), (node) => {
      if (MODAL_OVERLAYS.has(node.tag)) sites.push({ label: `${appLabel(file)}:${node.loc.start.line} <${node.tag}>`, node })
    })
  }
})

describe('modal overlays', () => {
  it('are read in both designs', () => {
    expect(sites.length).toBeGreaterThan(20)
    expect(sites.some(site => site.label.startsWith('components/variants/webside/'))).toBe(true)
  })

  it('never turn their overlay off', () => {
    const turnedOff = sites.filter(({ node }) => {
      const bound = boundAttribute(node, 'overlay')
      const staticFalse = node.props.some(prop => prop.type === 6 && prop.name === 'overlay' && prop.value?.content === 'false')
      return staticFalse || (bound !== undefined && bound.trim() !== 'true')
    })
    expect(turnedOff.map(site => site.label)).toEqual([])
  })
})
