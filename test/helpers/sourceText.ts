import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { babelParse, parse } from 'vue/compiler-sfc'
import type { SFCDescriptor } from 'vue/compiler-sfc'

/*
 * The template AST types live in `@vue/compiler-core`, which is not a
 * direct dependency (pnpm does not hoist it); derive them from the SFC
 * descriptor instead of importing them.
 */
export type RootNode = NonNullable<NonNullable<SFCDescriptor['template']>['ast']>
export type TemplateChildNode = RootNode['children'][number]
export type ElementNode = Extract<TemplateChildNode, { tagType: unknown }>

/**
 * Helpers for specs that assert on SOURCE TEXT rather than behaviour —
 * the rules under `test/unit/source-rules/`.
 *
 * A rule read off the source fires on its own documentation: several
 * rules explain, in a comment, the exact pattern they forbid — and
 * matched themselves. Blanking comment bodies while keeping the line
 * count intact keeps reported line numbers honest.
 *
 * Reads and SFC parses are memoised for the test file (vitest isolates
 * modules per file): most rules walk the whole of `app/`, and several
 * read the same file more than once.
 */

export const REPO = resolve(import.meta.dirname, '../..')
export const APP = resolve(REPO, 'app')
export const COMPONENTS = resolve(APP, 'components')

/**
 * The FROZEN tree: webside's storefront, kept byte-for-byte while the
 * defaults are redesigned, and registered with the `Webside` prefix
 * (`nuxt.config.ts` `components`). Layout rules exempt it — its render
 * is pinned. The other `variants/<schema>/` trees (delta_sigma's chrome
 * and sections) are LIVE code and are not exempt.
 */
export const FROZEN = resolve(COMPONENTS, 'variants/webside')
export const FROZEN_PREFIX = 'Webside'

/** Replace every character of `match` except newlines with a space. */
const blank = (match: string) => match.replace(/[^\r\n]/g, ' ')

/**
 * Blank out HTML, block and line comments, preserving line numbers.
 *
 * The line-comment pattern requires a non-`:` character before `//` so
 * that a `https://` inside a string survives. It is NOT string-aware
 * otherwise: a glob such as `'app/**\/*.vue'` opens a block comment, which
 * is why config files are parsed (`parseScript`) rather than stripped.
 */
export function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\r\n]*/gm, (match, lead: string) => lead + blank(match.slice(lead.length)))
}

/**
 * Every `.vue` file under `root`, sorted. `exclude` lists directories
 * skipped by their exact path — `[FROZEN]` drops the frozen webside
 * tree and nothing else.
 */
export function vueFiles(root: string, { exclude = [] }: { exclude?: readonly string[] } = {}): string[] {
  const skipped = new Set(exclude.map(dir => resolve(dir)))
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        if (!skipped.has(path)) walk(path)
      }
      else if (entry.name.endsWith('.vue')) {
        out.push(path)
      }
    }
  }
  walk(root)
  return out.sort()
}

/** `file` relative to `base`, `/`-separated on every platform. */
export function relativeLabel(base: string, file: string): string {
  return relative(base, file).split(sep).join('/')
}

/** `file` relative to `app/` — how every rule names an offender. */
export const appLabel = (file: string) => relativeLabel(APP, file)

const sources = new Map<string, string>()
/** The file's text, read once per test file. */
export function readSource(file: string): string {
  let source = sources.get(file)
  if (source === undefined) {
    source = readFileSync(file, 'utf8')
    sources.set(file, source)
  }
  return source
}

const descriptors = new Map<string, SFCDescriptor>()
/** The file's SFC descriptor, parsed once per test file. */
export function parseSfc(file: string): SFCDescriptor {
  let descriptor = descriptors.get(file)
  if (!descriptor) {
    descriptor = parse(readSource(file), { filename: file }).descriptor
    descriptors.set(file, descriptor)
  }
  return descriptor
}

/** The template AST, or `undefined` for a render-function component. */
export const sfcTemplate = (file: string): RootNode | undefined => parseSfc(file).template?.ast

/** Both script blocks' source, `<script>` first, joined for text matching (line numbers do not map back). */
export function sfcScript(file: string): string {
  const descriptor = parseSfc(file)
  return `${descriptor.script?.content ?? ''}\n${descriptor.scriptSetup?.content ?? ''}`
}

/**
 * A babel (ESTree-shaped) node, typed loosely on purpose: `@babel/types`
 * is not a dependency of this project, and a rule only ever reads a few
 * well-known fields.
 */
export interface AstNode {
  type: string
  loc?: { start: { line: number } } | null
  [key: string]: any
}

/** A TypeScript module as a babel AST. */
export const parseScript = (source: string): AstNode =>
  babelParse(source, { sourceType: 'module', plugins: ['typescript'] }).program as unknown as AstNode

/** A TypeScript expression (a template binding, say) as a babel AST. */
export const parseExpression = (source: string): AstNode =>
  (parseScript(`(${source})`).body[0] as AstNode).expression

interface ScriptBlockAst { program: AstNode, lineOffset: number }
const scriptAsts = new Map<string, ScriptBlockAst[]>()
/**
 * Each script block parsed on its own, with the offset that turns a
 * node's `loc.start.line` into a line of the `.vue` file.
 */
export function sfcScriptAsts(file: string): ScriptBlockAst[] {
  let blocks = scriptAsts.get(file)
  if (!blocks) {
    const descriptor = parseSfc(file)
    blocks = [descriptor.script, descriptor.scriptSetup]
      .filter(block => block !== null)
      .map(block => ({ program: parseScript(block.content), lineOffset: block.loc.start.line - 1 }))
    scriptAsts.set(file, blocks)
  }
  return blocks
}

/** Every node in `root`, depth first, each with its parent chain. */
export function walkAst(root: AstNode, visit: (node: AstNode, parents: readonly AstNode[]) => void): void {
  const walk = (node: AstNode, parents: AstNode[]) => {
    visit(node, parents)
    const next = [...parents, node]
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') continue
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child.type === 'string') walk(child, next)
      }
      else if (value && typeof value === 'object' && typeof value.type === 'string') {
        walk(value, next)
      }
    }
  }
  walk(root, [])
}

/**
 * Every call to a function named by `callee` in the file's scripts,
 * with its line in the `.vue` file.
 */
export function callsIn(file: string, callee: RegExp): Array<{ call: AstNode, parents: readonly AstNode[], line: number }> {
  const out: Array<{ call: AstNode, parents: readonly AstNode[], line: number }> = []
  for (const { program, lineOffset } of sfcScriptAsts(file)) {
    walkAst(program, (node, parents) => {
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && callee.test(node.callee.name)) {
        out.push({ call: node, parents, line: lineOffset + (node.loc?.start.line ?? 0) })
      }
    })
  }
  return out
}

/**
 * The static text of a string or template literal (`${…}` kept as a
 * placeholder), or `undefined` for anything computed.
 */
export function staticText(node: AstNode | undefined): string | undefined {
  if (!node) return undefined
  if (node.type === 'StringLiteral') return node.value
  if (node.type === 'TemplateLiteral') return node.quasis.map((q: AstNode) => q.value.cooked).join('${}')
  return undefined
}

/** A non-computed, non-spread property of an object literal, by key. */
export function propertyOf(object: AstNode | undefined, key: string): AstNode | undefined {
  if (object?.type !== 'ObjectExpression') return undefined
  return object.properties.find((p: AstNode) =>
    p.type === 'ObjectProperty' && !p.computed
    && ((p.key.type === 'Identifier' && p.key.name === key) || (p.key.type === 'StringLiteral' && p.key.value === key)),
  )?.value
}

export const isElement = (node: TemplateChildNode): node is ElementNode => node.type === 1

/** Every class an element names, static or bound, as one whitespace-collapsed string. */
export function classesOf(node: ElementNode): string {
  const parts: string[] = []
  for (const prop of node.props) {
    if (prop.type === 6 && prop.name === 'class' && prop.value) parts.push(prop.value.content)
    else if (prop.type === 7 && prop.name === 'bind' && prop.arg && 'content' in prop.arg && prop.arg.content === 'class' && prop.exp && 'content' in prop.exp) {
      // `:class` and `v-bind:class` alike.
      parts.push(String(prop.exp.content))
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/** The source of a bound attribute (`:ui="…"` → `…`), if the element has one. */
export function boundAttribute(node: ElementNode, name: string): string | undefined {
  for (const prop of node.props) {
    if (prop.type === 7 && prop.name === 'bind' && prop.arg && 'content' in prop.arg && prop.arg.content === name && prop.exp && 'content' in prop.exp) {
      return String(prop.exp.content)
    }
  }
  return undefined
}

/**
 * Depth-first visit of every element in a template, with its element
 * ancestors. Returning `false` from `visit` skips that element's subtree.
 */
export function walkElements(
  root: RootNode | ElementNode | undefined,
  visit: (node: ElementNode, ancestors: readonly ElementNode[]) => unknown,
): void {
  const walk = (node: TemplateChildNode, ancestors: ElementNode[]) => {
    if (!isElement(node)) return
    if (visit(node, ancestors) === false) return
    const next = [...ancestors, node]
    for (const child of node.children) walk(child, next)
  }
  for (const child of root?.children ?? []) walk(child, [])
}

function splitCase(value: string): string[] {
  return value
    .split(/[-_ ]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)
    .filter(Boolean)
}

/**
 * Nuxt's component name for a path relative to a components directory
 * (`resolveComponentNameSegments` in `@nuxt/kit`): a `.client`/`.server`
 * suffix ignored, `index` dropped, and — when the filename starts with
 * the tail of its directory path, compared case-insensitively — those
 * DIRECTORY segments dropped, so the file's own casing wins
 * (`Cart/CartButton.vue` → `CartButton`, `Html/HTMLBlock.vue` →
 * `HTMLBlock`, `Account/2Fa/RecoveryCodes/index.vue` →
 * `Account2FaRecoveryCodes`). Checked against `.nuxt/components.d.ts`.
 */
export function componentName(rel: string): string {
  const parts = rel.replace(/\.vue$/, '').split('/')
  const file = (parts.pop() ?? '').replace(/\.(client|server)$/, '')
  const fileSegments = file === 'index' ? [] : splitCase(file)
  const fileContent = fileSegments.join('/').toLowerCase()
  const prefixSegments = parts.flatMap(splitCase)
  let keep = prefixSegments.length
  const suffix: string[] = []
  for (let index = parts.length - 1; index >= 0; index--) {
    suffix.unshift(...splitCase(parts[index]!).map(s => s.toLowerCase()))
    const suffixContent = suffix.join('/')
    if (fileContent === suffixContent || fileContent.startsWith(`${suffixContent}/`)) {
      keep = prefixSegments.length - suffix.length
      break
    }
  }
  return [...prefixSegments.slice(0, keep), ...fileSegments]
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

/**
 * The name Nuxt auto-imports a file under `app/components/` as — the
 * frozen tree is its own components dir with the `Webside` prefix
 * (`nuxt.config.ts` `components`), everything else plain.
 */
export function autoImportName(file: string): string {
  const frozen = relativeLabel(FROZEN, file)
  return frozen.startsWith('..')
    ? componentName(relativeLabel(COMPONENTS, file))
    : FROZEN_PREFIX + componentName(frozen)
}

/** Auto-import name → file, for `files` under `app/components/`. */
export function componentsByName(files: readonly string[]): Map<string, string> {
  return new Map(files.map(file => [autoImportName(file), file]))
}
