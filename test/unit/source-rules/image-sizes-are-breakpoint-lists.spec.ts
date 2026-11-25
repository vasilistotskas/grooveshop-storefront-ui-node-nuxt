import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  APP,
  REPO,
  appLabel,
  boundAttribute,
  parseExpression,
  parseScript,
  propertyOf,
  readSource,
  sfcScriptAsts,
  sfcTemplate,
  staticText,
  vueFiles,
  walkAst,
  walkElements,
} from '../../helpers/sourceText'
import type { AstNode, ElementNode } from '../../helpers/sourceText'

/**
 * An image's `sizes` is @nuxt/image's list of `breakpoint:width` pairs
 * (`xs:50vw md:33vw lg:20vw xxl:256px`), never a native media-query string.
 *
 * @nuxt/image does not read `(max-width: 640px) 400px, 672px`: its
 * `parseSizes` splits on spaces and commas and keeps the last bare token, so
 * the srcset held ONE candidate at the last width for every screen. Blog
 * covers, recently viewed and the suggestions strip shipped that way
 * (webside post 105: `srcset="…/672/340/… 672w" sizes="672px"`, 2026-11-21).
 *
 * Every value a template hands an image component is checked: a static
 * attribute, a literal binding, a `const` the binding names and the strings
 * a function the binding calls returns. A component that forwards its own
 * `sizes` prop is checked where it is given one. Native `<img>` and
 * `<source>` take the browser's syntax and are not image components.
 */

const NATIVE = new Set(['img', 'source'])

/** The breakpoint names `image.screens` in `nuxt.config.ts` defines. */
function configuredScreens(): string[] {
  let screens: string[] = []
  walkAst(parseScript(readSource(resolve(REPO, 'nuxt.config.ts'))), (node) => {
    if (node.type !== 'ObjectProperty' || node.key.name !== 'image') return
    const value = propertyOf(node.value, 'screens')
    if (value?.type === 'ObjectExpression') {
      screens = value.properties.map((p: AstNode) => p.key.name ?? p.key.value)
    }
  })
  return screens
}

const SCREENS = configuredScreens()
// `${}` stands for an interpolated number (`xs:${PHONE_WIDTH}px`).
const TOKEN = new RegExp(`^(?:(?:${SCREENS.join('|')}):)?(?:\\d+|\\$\\{\\})(?:px|vw)$`)

const isBreakpointList = (value: string) => value.trim().split(/\s+/).every(token => TOKEN.test(token))

const unwrap = (node: AstNode | undefined): AstNode | undefined =>
  node && (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression') ? unwrap(node.expression) : node

/** The initializer of a top-level `const` or function of the file's scripts. */
function declarationOf(file: string, name: string): AstNode | undefined {
  let found: AstNode | undefined
  for (const { program } of sfcScriptAsts(file)) {
    walkAst(program, (node) => {
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.id.name === name) found = unwrap(node.init)
      if (node.type === 'FunctionDeclaration' && node.id?.name === name) found = node
    })
  }
  return found
}

/** Every string the expression can be, or `undefined` when it cannot be read. */
function valuesOf(file: string, expression: AstNode): string[] | undefined {
  const literal = staticText(unwrap(expression))
  if (literal !== undefined) return [literal]
  const target = expression.type === 'Identifier'
    ? declarationOf(file, expression.name)
    : expression.type === 'CallExpression' && expression.callee.type === 'Identifier'
      ? declarationOf(file, expression.callee.name)
      : undefined
  if (!target) return undefined
  const strings: string[] = []
  walkAst(target, (node) => {
    const text = node.type === 'StringLiteral' || node.type === 'TemplateLiteral' ? staticText(node) : undefined
    if (text !== undefined) strings.push(text)
  })
  return strings.length ? strings : undefined
}

function staticSizes(node: ElementNode): string | undefined {
  for (const prop of node.props) {
    if (prop.type === 6 && prop.name === 'sizes') return prop.value?.content
  }
  return undefined
}

describe('image sizes', () => {
  it('reads the breakpoints from the image config', () => {
    expect(SCREENS).toEqual(expect.arrayContaining(['xs', 'sm', 'md', 'lg', 'xl']))
  })

  it('are @nuxt/image breakpoint lists wherever a template sets one', () => {
    const offenders: string[] = []
    const unread: string[] = []
    let checked = 0
    for (const file of vueFiles(APP)) {
      walkElements(sfcTemplate(file), (node) => {
        if (NATIVE.has(node.tag)) return
        const where = `${appLabel(file)}:${node.loc.start.line}`
        const literal = staticSizes(node)
        const bound = boundAttribute(node, 'sizes')
        let values: string[] | undefined
        if (literal !== undefined) values = [literal]
        else if (bound !== undefined) {
          const expression = parseExpression(bound)
          // A component forwarding its own `sizes` prop; its callers are checked.
          if (expression.type === 'Identifier' && expression.name === 'sizes') return
          values = valuesOf(file, expression)
          if (!values) unread.push(`${where} :sizes="${bound}"`)
        }
        for (const value of values ?? []) {
          checked++
          if (!isBreakpointList(value)) offenders.push(`${where} sizes="${value}"`)
        }
      })
    }

    expect(checked, 'the walker must still find sizes').toBeGreaterThan(30)
    expect(unread, 'bind sizes to a literal, a const or a function returning literals').toEqual([])
    expect(offenders, 'write `breakpoint:width` pairs, e.g. "xs:50vw md:33vw lg:256px"').toEqual([])
  })
})
