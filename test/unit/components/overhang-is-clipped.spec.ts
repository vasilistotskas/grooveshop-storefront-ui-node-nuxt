import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'vue/compiler-sfc'
import type { ElementNode, TemplateChildNode } from 'vue/compiler-sfc'

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
 * decoration that is doing no harm.
 *
 * A parent COMPONENT's clipping does not count. The check cannot see
 * through a component boundary, and relying on one is fragile anyway —
 * whoever mounts this component is free to change. A section that hangs
 * something outside its own box clips it itself.
 *
 * The frozen `variants/` trees are exempt: their overflow is the render
 * those tenants have today, and the freeze is byte-identical on purpose.
 */
const ROOTS = [
  resolve(__dirname, '../../../app/components'),
  resolve(__dirname, '../../../app/layouts'),
]

function vueFilesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFilesUnder(path, out)
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

const isElement = (node: TemplateChildNode): node is ElementNode => node.type === 1

/** Every class an element names, static or bound, as one string. */
function classesOf(node: ElementNode): string {
  const parts: string[] = []
  for (const prop of node.props) {
    if (prop.type === 6 && prop.name === 'class' && prop.value) parts.push(prop.value.content)
    else if (prop.type === 7 && prop.rawName === ':class' && prop.exp && 'content' in prop.exp) parts.push(String(prop.exp.content))
  }
  return parts.join(' ').replace(/[\s]+/g, ' ')
}

/**
 * Class lists arrive as one blob of template source, so a class is
 * recognised by what can precede it: the start, whitespace, a quote or
 * a breakpoint/state colon (`lg:-right-12`).
 */
const EDGE = '(?:^|[\\s\'"`:\\[])'
const TAKEN_OUT_OF_FLOW = new RegExp(`${EDGE}(?:absolute|fixed)(?:$|[\\s'"\`])`)
const HANGS_SIDEWAYS = new RegExp(`${EDGE}-(?:left|right|start|end|inset-x|inset)-[0-9]`)
const CLIPS = new RegExp(`${EDGE}overflow-(?:hidden|clip|x-hidden|x-clip)(?:$|[\\s'"\`])`)

/**
 * Comments legitimately NAME the classes this rule forbids — two
 * carousels carry a note about the arrows that used to sit at
 * `sm:-start-12` — so they are stripped before anything is matched.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*/g, ' ')
}

describe('elements that hang past their box sideways', () => {
  it('are clipped by an ancestor element in the same template', () => {
    const offenders: string[] = []

    for (const root of ROOTS) {
      for (const file of vueFilesUnder(root)) {
        if (relative(root, file).split(sep).includes('variants')) continue

        const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
        const ast = descriptor.template?.ast
        if (!ast) continue

        const label = relative(resolve(__dirname, '../../../app'), file).split(sep).join('/')
        const walk = (node: TemplateChildNode, clipped: boolean) => {
          if (!isElement(node)) return
          const classes = classesOf(node)
          if (!clipped && TAKEN_OUT_OF_FLOW.test(classes) && HANGS_SIDEWAYS.test(classes)) {
            offenders.push(`${label}: ${classes.trim()}`)
          }
          const clips = clipped || CLIPS.test(classes)
          for (const child of node.children) walk(child, clips)
        }
        for (const child of ast.children) walk(child, false)
      }
    }

    expect(offenders, 'these hang outside their box horizontally with nothing clipping them, which widens the document').toEqual([])
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
    const offenders: string[] = []

    for (const root of ROOTS) {
      for (const file of vueFilesUnder(root)) {
        if (relative(root, file).split(sep).includes('variants')) continue

        const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
        const label = relative(resolve(__dirname, '../../../app'), file).split(sep).join('/')
        const sources: string[] = [
          descriptor.script?.content ?? '',
          descriptor.scriptSetup?.content ?? '',
        ]

        const collectUi = (node: TemplateChildNode) => {
          if (!isElement(node)) return
          for (const prop of node.props) {
            if (prop.type === 7 && prop.rawName === ':ui' && prop.exp && 'content' in prop.exp) sources.push(String(prop.exp.content))
          }
          node.children.forEach(collectUi)
        }
        descriptor.template?.ast?.children.forEach(collectUi)

        for (const source of sources) {
          const clean = withoutComments(source)
          const hit = clean.match(HANGS_SIDEWAYS)
          if (hit) offenders.push(`${label}: a ui slot positions something at ${hit[0].trim()}`)
        }
      }
    }

    expect(offenders, 'these push a library component\'s own markup outside it, where nothing in this file can clip it').toEqual([])
  })
})
