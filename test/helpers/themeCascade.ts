import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { THEME_SHADES } from '~~/shared/theme/constants'
import { MAIN_CSS, NUXT_UI_PALETTES } from '~~/test/helpers/themeRender'

/**
 * The custom properties an element of a store's page computes, from the real
 * stylesheets, by the cascade a browser runs:
 * - Tailwind's theme and Nuxt UI's (`tailwindcss/index.css`, the generated
 *   `.nuxt/ui.css`), `runtime/index.css` and the colours Nuxt UI writes per
 *   app config, all layered, in the layer order Tailwind declares
 *   (`@layer theme, base, components, utilities`);
 * - then `main.css` and the accessibility toolbar's `accessibility.css` (its
 *   rules match only the toolbar's `<html>` classes);
 * - then the store's theme block (`themeCss`), unlayered and last.
 *
 * Every rule that declares a custom property is read, selector by selector:
 * an unlayered declaration beats a layered one, then the later layer, then
 * specificity, then source order. A custom property's `var()` references are
 * resolved ON THE ELEMENT THAT DECLARES IT and its child inherits the result,
 * as a browser computes it: a token declared only on `<html>` that refers to
 * a scheme token keeps the page's scheme inside a band forced into the other
 * one, and a comparison sees it. A reference to nothing stays as written.
 *
 * It answers what `themeRender.ts` cannot: what an element INSIDE the page
 * gets (a band forced light or dark with Nuxt UI's `.light` / `.dark` class),
 * and what the root of the page computes from a given set of stylesheets
 * (the baseline check in `schemes.spec.ts` runs it over `origin/main`'s).
 *
 * What it does not model is held out on both sides of every comparison:
 * `@media` conditions (every block applies), `:has()`, `:host`, `:active`
 * and other state pseudo-classes and pseudo-elements (they match nothing).
 */

/** One element on the path from `<html>` down: its tag, classes and attributes. */
export interface CascadeElement {
  tag: string
  classes?: readonly string[]
  attrs?: Readonly<Record<string, string>>
}

interface Rule {
  selectors: string[]
  /** `-1` for unlayered; else the layer's rank in the declared order. */
  layer: number
  order: number
  declarations: Array<[string, string]>
}

const require = createRequire(import.meta.url)
const TAILWIND_CSS = readFileSync(require.resolve('tailwindcss/index.css'), 'utf8')
const NUXT_UI_CSS = readFileSync(require.resolve('@nuxt/ui/runtime/index.css'), 'utf8')
const NUXT_UI_THEME_FILE = new URL('../../.nuxt/ui.css', import.meta.url)
if (!existsSync(NUXT_UI_THEME_FILE)) throw new Error('.nuxt/ui.css is missing: run `pnpm prepare` (nuxt prepare) first')
const NUXT_UI_THEME = readFileSync(NUXT_UI_THEME_FILE, 'utf8')

/** The storefront's own stylesheets, which a change to the colour schemes edits. */
export interface StoreSheets {
  main: string
  accessibility: string
}

export const STORE_SHEETS: StoreSheets = {
  main: MAIN_CSS,
  accessibility: readFileSync(new URL('../../app/assets/css/accessibility.css', import.meta.url), 'utf8'),
}

/** Nuxt UI's `#nuxt-ui-colors` block (its `colors` plugin), for this app config. */
function nuxtUiColors(): string {
  const shades = Object.entries(NUXT_UI_PALETTES)
    .flatMap(([key, palette]) => THEME_SHADES.map(shade => `--ui-color-${key}-${shade}: var(--color-${palette === 'neutral' ? 'old-neutral' : palette}-${shade});`))
  const keys = Object.keys(NUXT_UI_PALETTES).filter(key => key !== 'neutral')
  return `@layer theme {
  :root, :host { ${shades.join(' ')} }
  :root, :host, .light { ${keys.map(key => `--ui-${key}: var(--ui-color-${key}-500);`).join(' ')} }
  .dark { ${keys.map(key => `--ui-${key}: var(--ui-color-${key}-400);`).join(' ')} }
}`
}

/** The index of the brace that closes the one at `open`. */
function closing(css: string, open: number): number {
  let depth = 0
  for (let at = open; at < css.length; at++) {
    if (css[at] === '{') depth++
    else if (css[at] === '}' && --depth === 0) return at
  }
  throw new Error('unbalanced braces')
}

/** Splits `text` on `separator` outside parentheses and brackets. */
function splitTop(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let at = 0; at < text.length; at++) {
    const char = text[at]
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, at))
      start = at + 1
    }
  }
  parts.push(text.slice(start))
  return parts.map(part => part.trim()).filter(Boolean)
}

/** A nested rule's selectors under its parent's, as CSS nesting reads them. */
const nest = (parents: string[], children: string[]) =>
  parents.length === 0
    ? children
    : parents.flatMap(parent => children.map(child => (child.includes('&') ? child.replaceAll('&', parent) : `${parent} ${child}`)))

interface ParseContext {
  layers: string[]
  rules: Rule[]
}

/** The rank of the layer `name`; a layer no `@layer a, b;` statement named comes after every named one. */
function layerRank(context: ParseContext, name: string): number {
  if (!context.layers.includes(name)) context.layers.push(name)
  return context.layers.indexOf(name)
}

function parseRules(css: string, context: ParseContext, layer: number, parents: string[]): void {
  let at = 0
  while (at < css.length) {
    const open = css.indexOf('{', at)
    const semicolon = css.indexOf(';', at)
    if (open === -1) return
    if (semicolon !== -1 && semicolon < open) {
      // `@layer theme, base, components, utilities;` fixes the layers' order.
      const statement = css.slice(at, semicolon).trim()
      if (statement.startsWith('@layer')) {
        for (const name of splitTop(statement.slice('@layer'.length), ',')) layerRank(context, name)
      }
      at = semicolon + 1
      continue
    }
    const prelude = css.slice(at, open).trim()
    const close = closing(css, open)
    const body = css.slice(open + 1, close)
    at = close + 1
    if (prelude.startsWith('@layer')) {
      parseRules(body, context, layerRank(context, prelude.slice('@layer'.length).trim()), parents)
    }
    else if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
      parseRules(body, context, layer, parents)
    }
    else if (prelude.startsWith('@theme')) {
      // Tailwind writes the theme's variables on `:root, :host` in its theme layer.
      parseRules(`:root, :host { ${body} }`, context, layerRank(context, 'theme'), parents)
    }
    else if (!prelude.startsWith('@')) {
      const selectors = nest(parents, splitTop(prelude, ','))
      const own = body.replace(/[^;{}]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
      const declarations = [...own.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)].map(([, name, value]) => [name!, value!.trim()] as [string, string])
      if (declarations.length) context.rules.push({ selectors, layer, order: context.rules.length, declarations })
      parseRules(body, context, layer, selectors)
    }
  }
}

/** Every rule of `sheets`, in order, with the layers they name. */
export function cascadeRules(...sheets: string[]): Rule[] {
  const context: ParseContext = { layers: [], rules: [] }
  for (const sheet of sheets) parseRules(sheet.replace(/\/\*[\s\S]*?\*\//g, ''), context, -1, [])
  return context.rules
}

type Specificity = [number, number, number]

const ZERO: Specificity = [0, 0, 0]
const add = (a: Specificity, b: Specificity): Specificity => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const compare = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

/** The simple selectors of a compound: `html.dark`, `[data-design="volt"]:where(.dark)`. */
function simples(compound: string): string[] {
  const found = compound.match(/::?[\w-]+(?:\((?:[^()]|\([^()]*\))*\))?|\.[\w-]+|#[\w-]+|\[[^\]]+\]|\*|[a-z][\w-]*/gi) ?? []
  if (found.join('').replace(/\s+/g, '') !== compound.replace(/\s+/g, '')) throw new Error(`cannot read the compound selector "${compound}"`)
  return found
}

/** Whether the element at `index` of `path` is matched by the compound, and with what specificity. */
function matchCompound(compound: string, path: readonly CascadeElement[], index: number): Specificity | null {
  const element = path[index]!
  let specificity = ZERO
  for (const simple of simples(compound)) {
    if (simple === '*') continue
    if (simple.startsWith('.')) {
      if (!element.classes?.includes(simple.slice(1))) return null
      specificity = add(specificity, [0, 1, 0])
    }
    else if (simple.startsWith('#')) {
      return null
    }
    else if (simple.startsWith('[')) {
      const [, name, value] = /^\[([\w-]+)(?:="?([^"\]]*)"?)?\]$/.exec(simple) ?? []
      if (!name || element.attrs?.[name] === undefined || (value !== undefined && element.attrs[name] !== value)) return null
      specificity = add(specificity, [0, 1, 0])
    }
    else if (simple === ':root') {
      if (index !== 0) return null
      specificity = add(specificity, [0, 1, 0])
    }
    else if (simple.startsWith(':where(') || simple.startsWith(':is(')) {
      const list = splitTop(simple.slice(simple.indexOf('(') + 1, -1), ',')
      const matched = list.map(selector => matchSelector(selector, path.slice(0, index + 1))).filter(found => found !== null)
      if (matched.length === 0) return null
      if (simple.startsWith(':is(')) specificity = add(specificity, matched.sort(compare).at(-1)!)
    }
    else if (simple.startsWith(':')) {
      // :host, :has(), state pseudo-classes and pseudo-elements: never the element itself.
      return null
    }
    else if (simple !== element.tag) {
      return null
    }
    else {
      specificity = add(specificity, [0, 0, 1])
    }
  }
  return specificity
}

/** A complex selector as its compounds and `>` combinators, outside parentheses and brackets. */
function combinatorParts(selector: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  const flush = () => {
    if (current) parts.push(current)
    current = ''
  }
  for (const char of selector.trim()) {
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    if (depth === 0 && (char === ' ' || char === '>' || char === '\n' || char === '\t')) {
      flush()
      if (char === '>') parts.push('>')
      continue
    }
    current += char
  }
  flush()
  return parts
}

/** The specificity with which `selector` matches the LAST element of `path`, or `null`. */
export function matchSelector(selector: string, path: readonly CascadeElement[]): Specificity | null {
  const parts = combinatorParts(selector)
  const match = (part: number, index: number): Specificity | null => {
    const own = matchCompound(parts[part]!, path, index)
    if (own === null) return null
    if (part === 0) return own
    const child = parts[part - 1] === '>'
    const before = child ? part - 2 : part - 1
    for (let ancestor = index - 1; ancestor >= 0; ancestor--) {
      const rest = match(before, ancestor)
      if (rest !== null) return add(own, rest)
      if (child) break
    }
    return null
  }
  return match(parts.length - 1, path.length - 1)
}

/** The declarations of the custom properties the last element of `path` wins in the cascade, unresolved. */
function cascaded(rules: readonly Rule[], path: readonly CascadeElement[]): Record<string, string> {
  const applying = rules.flatMap((rule) => {
    const best = rule.selectors.map(selector => matchSelector(selector, path)).filter(found => found !== null).sort(compare).at(-1)
    return best ? [{ rule, specificity: best }] : []
  })
  // Layered before unlayered, earlier layer before later, then specificity, then source order: the last one wins.
  applying.sort((a, b) =>
    (a.rule.layer === -1 ? 1 : 0) - (b.rule.layer === -1 ? 1 : 0)
    || a.rule.layer - b.rule.layer
    || compare(a.specificity, b.specificity)
    || a.rule.order - b.rule.order)
  return Object.fromEntries(applying.flatMap(({ rule }) => rule.declarations))
}

/** `text` with each `var(--name[, fallback])` replaced through `lookup`; a name with no value and no fallback stays as written. */
function substitute(text: string, lookup: (name: string) => string | undefined): string {
  let out = ''
  let at = 0
  while (true) {
    const start = text.indexOf('var(', at)
    if (start < 0) return out + text.slice(at)
    let depth = 0
    let end = start + 3
    for (; end < text.length; end++) {
      if (text[end] === '(') depth++
      else if (text[end] === ')' && --depth === 0) break
    }
    const [name, ...fallback] = splitTop(text.slice(start + 4, end), ',')
    const value = lookup(name!) ?? (fallback.length ? substitute(fallback.join(', '), lookup) : undefined)
    out += text.slice(at, start) + (value ?? text.slice(start, end + 1))
    at = end + 1
  }
}

/** The custom properties the last element of `path` computes from `rules`: its own resolved on it, the rest inherited. */
export function computedTokens(rules: readonly Rule[], path: readonly CascadeElement[]): Record<string, string> {
  const inherited: Record<string, string> = path.length > 1 ? computedTokens(rules, path.slice(0, -1)) : {}
  const own = cascaded(rules, path)
  const resolved = new Map<string, string | undefined>()
  const resolving = new Set<string>()
  const value = (name: string): string | undefined => {
    if (!(name in own)) return inherited[name]
    if (resolved.has(name)) return resolved.get(name)
    // A cycle is invalid at computed-value time: the property has no value.
    if (resolving.has(name)) return undefined
    resolving.add(name)
    const result = substitute(own[name]!, value)
    resolving.delete(name)
    resolved.set(name, result)
    return result
  }
  const declared = new Map(Object.keys(own).map(name => [name, value(name)] as const))
  return Object.fromEntries([
    ...Object.entries(inherited).filter(([name]) => !declared.has(name)),
    ...[...declared].filter((entry): entry is [string, string] => entry[1] !== undefined),
  ])
}

/** The rules of a store's page whose theme block is `themeCss`, over the storefront's own `sheets` (today's by default). */
export function pageRules(themeCss: string, sheets: StoreSheets = STORE_SHEETS): Rule[] {
  return cascadeRules(TAILWIND_CSS, NUXT_UI_THEME, NUXT_UI_CSS, nuxtUiColors(), sheets.main, sheets.accessibility, themeCss)
}

/**
 * The tokens the colour schemes are about: every custom property Nuxt UI's
 * runtime and colours, `main.css`, `accessibility.css` and the theme block
 * declare. Tailwind's palette and Nuxt UI's generated aliases are read to
 * resolve them, not compared themselves.
 */
export function schemeTokenNames(themeCss: string, sheets: StoreSheets = STORE_SHEETS): Set<string> {
  return new Set(cascadeRules(NUXT_UI_CSS, nuxtUiColors(), sheets.main, sheets.accessibility, themeCss).flatMap(rule => rule.declarations.map(([name]) => name)))
}

/** `<html>` of a page in `scheme`, in the Volt design or in a design of a store's own, with any further classes (the accessibility toolbar's). */
export function htmlElement(scheme: 'light' | 'dark', volt: boolean, ...classes: string[]): CascadeElement {
  return { tag: 'html', classes: [scheme, ...classes], attrs: volt ? { 'data-design': 'volt' } : {} }
}
