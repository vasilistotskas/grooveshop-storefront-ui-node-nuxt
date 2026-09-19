import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'vue/compiler-sfc'
import type { ElementNode, TemplateChildNode } from 'vue/compiler-sfc'

/**
 * A decorative blur that hangs outside its box must be CLIPPED BY AN
 * ANCESTOR IN THE SAME TEMPLATE.
 *
 * These are absolutely-positioned circles placed deliberately past the
 * edge of their band (`-top-24 -left-20 … blur-3xl`) so the colour
 * bleeds in from off-screen. With nothing clipping them they do not
 * merely paint outside: they make the DOCUMENT wider, and the page
 * scrolls sideways. On fyteia that was a 390px phone scrolling to
 * 454px — exactly the width of one orb hanging off the right edge.
 *
 * The check walks the real template tree rather than searching the
 * file for the string, because "the file mentions `overflow-hidden`
 * somewhere" is not the property that matters: `HeroBanner` clips on
 * its `<section>` and `MediaText` on the grid that holds the orb, and
 * a file-level search would keep passing if either moved the class
 * onto a sibling. A parent COMPONENT's clipping does not count — a
 * section that hangs decoration outside its own box clips it itself
 * rather than hoping whatever mounts it does.
 */
const ROOTS = [
  resolve(__dirname, '../../../app/components/PageSection'),
  resolve(__dirname, '../../../app/components/PageSection/variants'),
]

function vueFilesUnder(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) out.push(...vueFilesUnder(path))
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

/** Every class this node names, static or bound, as one string. */
function classesOf(node: ElementNode): string {
  const parts: string[] = []
  for (const prop of node.props) {
    if (prop.type === 6 && prop.name === 'class' && prop.value) parts.push(prop.value.content)
    // `:class` — the literals inside the expression are enough; a class
    // computed at runtime cannot be checked statically either way.
    else if (prop.type === 7 && prop.rawName === ':class' && prop.exp && 'content' in prop.exp) parts.push(String(prop.exp.content))
  }
  return parts.join(' ')
}

/** Taken out of flow, pulled outside its box, and blurred. */
function hangsOutside(classes: string): boolean {
  return /\babsolute\b/.test(classes)
    && /-(top|bottom|left|right|start|end)-\d/.test(classes)
    && /\bblur-(2xl|3xl)\b/.test(classes)
}

describe('decorative blurs', () => {
  it('are clipped by an ancestor element in the same template', () => {
    const offenders: string[] = []

    for (const root of ROOTS) {
      for (const file of vueFilesUnder(root)) {
        const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
        const ast = descriptor.template?.ast
        if (!ast) continue

        const label = file.split(/[\/]/).slice(-2).join('/')
        const walk = (node: TemplateChildNode, clippedBy: boolean) => {
          if (node.type !== 1) return
          const element = node as ElementNode
          const classes = classesOf(element)
          if (hangsOutside(classes) && !clippedBy) offenders.push(`${label}: ${classes.replace(/\s+/g, ' ').trim()}`)
          const clips = clippedBy || /\boverflow-hidden\b/.test(classes)
          for (const child of element.children) walk(child, clips)
        }
        for (const child of ast.children) walk(child, false)
      }
    }

    expect(offenders, 'these place a blurred decoration with nothing clipping it').toEqual([])
  })
})
