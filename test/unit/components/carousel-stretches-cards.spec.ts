import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parse } from 'vue/compiler-sfc'
import type { ElementNode, TemplateChildNode } from 'vue/compiler-sfc'

/**
 * A carousel whose slides hold `h-full` content must stretch them.
 *
 * `UCarousel`'s container slot is `items-start`, so every slide takes
 * its own natural height. A card that says `h-full` is then sizing
 * itself against a box that already fits it exactly — the class is dead
 * code, and one short card (a product with no reviews, a category with
 * a one-line name) leaves the row's bottom edge ragged with the buy
 * buttons on different lines. Measured on the demo homepage before the
 * fix: 422 / 450 / 474px in a single row.
 *
 * So: if anything a carousel puts in a slide declares `h-full`, that
 * carousel's `ui.container` must say `items-stretch`. The check follows
 * component tags one level into their own file, because the `h-full`
 * that matters usually lives on the card, not at the call site.
 *
 * The frozen `variants/` trees are exempt — their ragged edges are the
 * render those tenants have today and the freeze is byte-identical on
 * purpose.
 */
const COMPONENTS = resolve(__dirname, '../../../app/components')

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) vueFiles(path, out)
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
  return parts.join(' ')
}

function templateOf(file: string) {
  const { descriptor } = parse(readFileSync(file, 'utf8'), { filename: file })
  return { ast: descriptor.template?.ast, script: `${descriptor.script?.content ?? ''}${descriptor.scriptSetup?.content ?? ''}` }
}

/**
 * The name Nuxt auto-imports a component under: its path from
 * `components/`, PascalCased and joined (`Blog/Post/Card/Desktop.vue`
 * becomes `BlogPostCardDesktop`).
 */
function relativeSegments(file: string): string[] {
  return relative(COMPONENTS, file).split(sep)
}

function autoImportName(file: string): string {
  const segments = relativeSegments(file)
  segments[segments.length - 1] = segments[segments.length - 1]!.replace('.vue', '')
  return segments.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
}

const files = vueFiles(COMPONENTS).filter(f => !relativeSegments(f).includes('variants'))
const byName = new Map(files.map(f => [autoImportName(f), f]))

/** Does this file's own template declare `h-full` on any element? */
const fillsCache = new Map<string, boolean>()
function fileDeclaresHFull(file: string): boolean {
  const cached = fillsCache.get(file)
  if (cached !== undefined) return cached
  fillsCache.set(file, false) // break cycles
  const { ast } = templateOf(file)
  let found = false
  const walk = (node: TemplateChildNode) => {
    if (!isElement(node) || found) return
    if (/\bh-full\b/.test(classesOf(node))) { found = true; return }
    node.children.forEach(walk)
  }
  ast?.children.forEach(walk)
  fillsCache.set(file, found)
  return found
}

function stretches(node: ElementNode): boolean {
  for (const prop of node.props) {
    if (prop.type === 7 && prop.rawName === ':ui' && prop.exp && 'content' in prop.exp) {
      if (/items-stretch/.test(String(prop.exp.content))) return true
    }
  }
  return false
}

describe('carousels that lay out cards', () => {
  it('stretch their slides when the slide content says h-full', () => {
    const offenders: string[] = []

    for (const file of files) {
      const { ast, script } = templateOf(file)
      if (!ast) continue
      const label = autoImportName(file)
      // A `:ui` object can name a constant declared in the script.
      const uiConstStretches = /items-stretch/.test(script)
      // `<component :is="x">` where x came from resolveComponent('Name').
      const resolved = [...script.matchAll(/resolveComponent\(\s*['"]([A-Za-z0-9]+)['"]/g)].map(m => m[1]!)

      const walk = (node: TemplateChildNode) => {
        if (!isElement(node)) return
        const tag = node.tag
        if (/^(Lazy)?UCarousel$/.test(tag)) {
          const names = new Set<string>(resolved)
          let inlineFill = false
          const collect = (child: TemplateChildNode) => {
            if (!isElement(child)) return
            if (/\bh-full\b/.test(classesOf(child))) inlineFill = true
            if (byName.has(child.tag)) names.add(child.tag)
            child.children.forEach(collect)
          }
          node.children.forEach(collect)

          const fills = inlineFill || [...names].some((name) => {
            const target = byName.get(name)
            return target ? fileDeclaresHFull(target) : false
          })

          const stretched = stretches(node) || uiConstStretches
          // Both halves matter. A slide that stretches around a card
          // that never fills it looks exactly as ragged as a card that
          // fills a slide free to shrink.
          if (fills && !stretched) {
            offenders.push(`${label}: slide content is h-full but ui.container never says items-stretch`)
          }
          if (stretched && !fills) {
            offenders.push(`${label}: ui.container says items-stretch but nothing in the slide is h-full`)
          }
        }
        node.children.forEach(walk)
      }
      ast.children.forEach(walk)
    }

    expect(offenders, 'these carousels leave a row of cards with a ragged bottom edge').toEqual([])
  })
})
