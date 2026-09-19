import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'vue/compiler-sfc'
import type { ElementNode, TemplateChildNode } from 'vue/compiler-sfc'

/**
 * Nothing inside a `PageSectionBand` may centre itself horizontally.
 *
 * The band owns the heading row, and it is LEFT-aligned in every
 * section — that is the whole point of putting it in one component
 * rather than letting each section write its own. A child that narrows
 * itself and then adds `mx-auto` therefore lands beside its own title
 * rather than under it: on the demo store's homepage at 1920 the FAQ
 * heading sat at x=265 and its first question at x=569, which reads as
 * two unrelated blocks.
 *
 * A reading measure is fine and often right — `max-w-3xl` on a column
 * of prose, `max-w-2xl` on a search field. It is the `mx-auto` beside
 * it that breaks the band.
 *
 * Only DIRECT children are checked. Deeper down, a centred element is
 * usually inside a card or a grid cell that has its own alignment, and
 * this rule would fight it.
 *
 * The frozen `variants/` trees are exempt, like every other layout
 * rule: their render is pinned byte-for-byte.
 */
const SECTIONS = resolve(__dirname, '../../../app/components/PageSection')

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
  return parts.join(' ').replace(/\s+/g, ' ')
}

const EDGE = '(?:^|[\\s\'"`:\\[])'
const CENTRES_ITSELF = new RegExp(`${EDGE}mx-auto(?:$|[\\s'"\`])`)

describe('a section band\'s content', () => {
  it('is not centred away from the heading the band renders', () => {
    const offenders: string[] = []

    for (const file of vueFilesUnder(SECTIONS)) {
      if (relative(SECTIONS, file).split(sep).includes('variants')) continue

      const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
      const ast = descriptor.template?.ast
      if (!ast) continue

      const label = relative(resolve(__dirname, '../../../app'), file).split(sep).join('/')
      const walk = (node: TemplateChildNode) => {
        if (!isElement(node)) return
        if (node.tag === 'PageSectionBand') {
          for (const child of node.children) {
            if (!isElement(child)) continue
            const classes = classesOf(child)
            if (CENTRES_ITSELF.test(classes)) {
              offenders.push(`${label}: <${child.tag}> ${classes.trim()}`)
            }
          }
          return
        }
        node.children.forEach(walk)
      }
      ast.children.forEach(walk)
    }

    expect(
      offenders,
      'these centre themselves under a left-aligned band heading; keep the max-width, drop the mx-auto',
    ).toEqual([])
  })
})
