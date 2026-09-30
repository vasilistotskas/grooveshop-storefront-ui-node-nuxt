import { describe, it, expect, beforeAll } from 'vitest'
import {
  COMPONENTS,
  FROZEN,
  appLabel,
  boundAttribute,
  classesOf,
  componentsByName,
  parseExpression,
  propertyOf,
  sfcScript,
  sfcScriptAsts,
  sfcTemplate,
  staticText,
  vueFiles,
  walkAst,
  walkElements,
} from '../../helpers/sourceText'
import type { AstNode, ElementNode } from '../../helpers/sourceText'

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
 * carousel's `ui.container` must say `items-stretch` — and the other way
 * round. The check follows component tags one level into their own file,
 * because the `h-full` that matters usually lives on the card, not at
 * the call site. `ui.container` is read from the `:ui` binding itself,
 * inline or through the script constant (or `computed`) it names.
 *
 * The frozen `variants/webside` tree is exempt — its ragged edges are
 * the render that store has today and the freeze is byte-identical on
 * purpose. The live `variants/delta_sigma` trees are checked.
 */
const H_FULL = /(?:^|[\s'"`:])h-full(?:$|[\s'"`])/

/** Does this file's own template declare `h-full` on any element? */
const fillsCache = new Map<string, boolean>()
function fileDeclaresHFull(file: string): boolean {
  let found = fillsCache.get(file)
  if (found === undefined) {
    found = false
    walkElements(sfcTemplate(file), (node) => {
      if (H_FULL.test(classesOf(node))) found = true
    })
    fillsCache.set(file, found)
  }
  return found
}

/** The object a script binding evaluates to: `const x = {…}` or `computed(() => ({…}))`. */
function declaredObject(file: string, name: string): AstNode | undefined {
  let init: AstNode | undefined
  for (const { program } of sfcScriptAsts(file)) {
    walkAst(program, (node) => {
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.id.name === name) init = node.init
    })
  }
  if (init?.type === 'CallExpression' && init.callee.name === 'computed') {
    const getter = init.arguments[0]
    init = getter?.body?.type === 'BlockStatement'
      ? getter.body.body.find((s: AstNode) => s.type === 'ReturnStatement')?.argument
      : getter?.body
  }
  return init?.type === 'TSAsExpression' || init?.type === 'TSSatisfiesExpression' ? init.expression : init
}

/** Does the carousel's `ui.container` say `items-stretch`? */
function stretches(node: ElementNode, file: string): boolean {
  const bound = boundAttribute(node, 'ui')
  if (!bound) return false
  const expression = parseExpression(bound)
  const ui = expression.type === 'Identifier' ? declaredObject(file, expression.name) : expression
  return /(?:^|\s)items-stretch(?:$|\s)/.test(staticText(propertyOf(ui, 'container')) ?? '')
}

interface Carousel { site: string, fills: boolean, stretched: boolean }

let carousels: Carousel[]

beforeAll(() => {
  const files = vueFiles(COMPONENTS, { exclude: [FROZEN] })
  const byName = componentsByName(files)
  carousels = []

  for (const file of files) {
    // `<component :is="x">` where x came from resolveComponent('Name').
    const resolved = [...sfcScript(file).matchAll(/resolveComponent\(\s*['"]([A-Za-z0-9]+)['"]/g)].map(m => m[1]!)

    walkElements(sfcTemplate(file), (node) => {
      if (!/^(Lazy)?UCarousel$/.test(node.tag)) return
      const names = new Set<string>(resolved)
      let inlineFill = false
      walkElements(node, (child) => {
        if (H_FULL.test(classesOf(child))) inlineFill = true
        const name = child.tag.replace(/^Lazy/, '')
        if (byName.has(name)) names.add(name)
      })
      const fills = inlineFill || [...names].some(name => fileDeclaresHFull(byName.get(name)!))
      carousels.push({ site: `${appLabel(file)}:${node.loc.start.line}`, fills, stretched: stretches(node, file) })
    })
  }
})

describe('carousels that lay out cards', () => {
  it('stretch their slides exactly when the slide content says h-full', () => {
    // Both halves matter. A slide that stretches around a card that
    // never fills it looks exactly as ragged as a card that fills a
    // slide free to shrink.
    const offenders = carousels.flatMap(({ site, fills, stretched }) => {
      if (fills && !stretched) return [`${site}: slide content is h-full but ui.container never says items-stretch`]
      if (stretched && !fills) return [`${site}: ui.container says items-stretch but nothing in the slide is h-full`]
      return []
    })

    expect(offenders, 'these carousels leave a row of cards with a ragged bottom edge').toEqual([])
  })

  it('still finds the stretched card carousels it is meant to check', () => {
    // Guards the naming and the `:ui` lookup: if either stopped
    // resolving, every carousel would read as "neither" and pass.
    expect(carousels.length).toBeGreaterThanOrEqual(10)
    expect(carousels.filter(c => c.fills && c.stretched).length).toBeGreaterThanOrEqual(6)
  })
})
