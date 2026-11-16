import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileScript } from 'vue/compiler-sfc'
import { builderSettingsFields } from '~/utils/builderSettingsFields'
import { APP, COMPONENTS, callsIn, componentsByName, isElement, parseScript, parseSfc, propertyOf, readSource, sfcTemplate, vueFiles, walkAst } from '../../helpers/sourceText'
import type { AstNode, ElementNode } from '../../helpers/sourceText'
import { realBlocks } from '~~/test/helpers/realBlocks'

/**
 * The settings form a store is offered for a section is what the component
 * drawing that section in the store's design reads: no control that changes
 * nothing, and no setting the component reads left out of the form.
 *
 * The form is `builderSettingsFields(definition, design)`: every setting, or,
 * where a design's own component (`<type>@<design>` in the component
 * registry) declares the settings it draws, those alone
 * (`editor.designSettings`). The platform's components (the base entries)
 * declare nothing, so they must draw every setting.
 *
 * What a component draws is read off its compiled script, the way Vue itself
 * sees it, rather than off a render:
 * - the props it declares (the runtime `props` Vue generates from
 *   `defineProps`): the renderer binds a section's settings with `v-bind`, so
 *   a setting that is not a prop never reaches the component's code;
 * - of those, the ones its code or template reads (`__props.x`, or `x` of the
 *   local `props`): a declared prop nobody reads is a control that does
 *   nothing all the same.
 * `toRef(props, 'x')` reads `x`. A component that hands its props on whole
 * (`heroImage(props)`, `v-bind="props"`, `toRefs(props)`) is taken to read
 * every prop it declares: where they go from there is the receiver's
 * business, and a prop that receiver ignores passes here unseen. A render test could not do better
 * without a valid value of every kind of setting per block, live data for each
 * query and a breakpoint per phone-only setting, and a setting it failed to
 * vary would pass as "drawn"; the compiler's view needs none of that and covers
 * every registry entry, the base ones included.
 *
 * A setting the component does not declare is an attribute, and Vue hands
 * the attributes to the component's root (`inheritAttrs`, on unless
 * `defineOptions({ inheritAttrs: false })`). When that root is another
 * component, what it draws of them is drawn too (webside's product bands
 * wrap the platform's band): the rule follows the root, recursively, less
 * what the wrapper binds on it itself.
 *
 * Settings only: a child block's form, drawn by its parent's component through
 * a list prop (`childList`), is not checked here.
 */
const definitions = realBlocks
const byType = new Map(definitions.map(block => [block.type, block]))

const registry = readSource(resolve(APP, 'utils/componentRegistry.ts'))
const entries = [...registry.matchAll(/^\s*'([a-z_]+)(?:@([A-Za-z_]\w*))?':\s*\w+\(\(\) => import\('~\/([^']+)'\)\)/gm)]
  .map(([, type, design, path]) => ({ type: type!, design, file: resolve(APP, path!), key: design ? `${type}@${design}` : type! }))
const hasVariant = (type: string, design: string) => entries.some(entry => entry.type === type && entry.design === design)

const isPropsRead = (node: AstNode, parent: AstNode | undefined) =>
  (parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') && parent.object === node && !parent.computed

/**
 * The props a component declares and reads, from its compiled script
 * (`inlineTemplate`, so the template's reads are in it too). `every` when it
 * hands its props on whole; `attrs` when it reads what falls through instead.
 */
function propsOf(file: string): { declared: string[], read: Set<string> | 'every', attrs: boolean } {
  const { content } = compileScript(parseSfc(file), { id: file, inlineTemplate: true })
  const program = parseScript(content)
  const component = program.body.find((node: AstNode) => node.type === 'ExportDefaultDeclaration')?.declaration
  const options = component?.type === 'CallExpression' ? component.arguments[0] : component
  const runtime = propertyOf(options, 'props')
  // `withDefaults` may compile to `mergeDefaults(<props>, <defaults>)`.
  const declaration = runtime?.type === 'CallExpression' ? runtime.arguments[0] : runtime
  const declared: string[] = (declaration?.properties ?? []).map((property: AstNode) => property.key.name ?? property.key.value)

  // `const props = defineProps(...)` compiles to `const props = __props`.
  const names = new Set(['__props'])
  walkAst(program, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'Identifier' && node.init.name === '__props') names.add(node.id.name)
  })

  const read = new Set<string>()
  let whole = false
  let attrs = false
  walkAst(program, (node, parents) => {
    const parent = parents.at(-1)
    if (node.type === 'Identifier' && node.name === 'useAttrs') attrs = true
    if (node.type !== 'Identifier' || !names.has(node.name)) return
    if (isPropsRead(node, parent)) {
      read.add(parent!.property.name)
      return
    }
    // `toRef(props, 'x')` reads `x` alone.
    const key = parent?.arguments?.[1]
    if (parent?.type === 'CallExpression' && parent.callee.type === 'Identifier' && parent.callee.name === 'toRef' && parent.arguments[0] === node && key?.type === 'StringLiteral') {
      read.add(key.value)
      return
    }
    const declaresAlias = parent?.type === 'VariableDeclarator' && (parent.id === node || parent.init === node)
    const isSetupParameter = parent?.params?.includes(node)
    // A name, not the props: the component's `props:` option, or `x.props`.
    const isKey = (parent?.type === 'ObjectProperty' || parent?.type === 'ObjectMethod') && parent.key === node && !parent.computed
    const isProperty = (parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') && parent.property === node && !parent.computed
    if (!declaresAlias && !isSetupParameter && !isKey && !isProperty) whole = true
  })
  walkAst(program, (node) => {
    if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') && !node.computed) {
      if (node.property.name === '$attrs') attrs = true
      if (node.property.name === '$props') whole = true
    }
  })
  return { declared, read: whole ? 'every' : read, attrs }
}

const components = componentsByName(vueFiles(COMPONENTS))
const camel = (name: string) => name.replace(/-(w)/g, (_match, letter: string) => letter.toUpperCase())
const pascal = (tag: string) => camel(tag).replace(/^w/, letter => letter.toUpperCase())

/** Whether the component hands what it does not declare to its root (`inheritAttrs`, on by default). */
function inheritsAttrs(file: string): boolean {
  return !callsIn(file, /^defineOptions$/).some(({ call }) => propertyOf(call.arguments[0], 'inheritAttrs')?.value === false)
}

/**
 * The template's root elements that take the attributes: the one root, or
 * each branch of a `v-if` chain at the root. None when there are several roots.
 */
function rootsOf(file: string): ElementNode[] {
  const roots = (sfcTemplate(file)?.children ?? []).filter(isElement)
  const chained = roots.slice(1).every(root => root.props.some(prop => prop.type === 7 && (prop.name === 'else' || prop.name === 'else-if')))
  return roots.length === 1 || chained ? roots : []
}

/** The props an element binds itself, by name: `foo="…"` and `:foo="…"`. */
function boundOn(element: ElementNode): Set<string> {
  return new Set(element.props.flatMap((prop) => {
    if (prop.type === 6) return [camel(prop.name)]
    if (prop.type === 7 && prop.name === 'bind' && prop.arg?.type === 4 && prop.arg.isStatic) return [camel(prop.arg.content)]
    return []
  }))
}

/**
 * The settings of the block the component draws: its own props that it
 * reads, and of the rest, which fall through to its root, what that root
 * component draws.
 */
function drawnBy(file: string, offered: readonly string[]): string[] {
  const { declared, read } = propsOf(file)
  const own = offered.filter(setting => declared.includes(setting) && (read === 'every' || read.has(setting)))
  if (!inheritsAttrs(file)) return own
  const passed = new Set<string>()
  for (const root of rootsOf(file)) {
    const target = root.tagType === 1 ? components.get(pascal(root.tag).replace(/^Lazy/, '')) : undefined
    if (!target) continue
    const bound = boundOn(root)
    const attrs = offered.filter(setting => !declared.includes(setting) && !bound.has(setting))
    for (const setting of drawnBy(target, attrs)) passed.add(setting)
  }
  return offered.filter(setting => own.includes(setting) || passed.has(setting))
}

describe('the settings form of each design', () => {
  // A canary: reading nothing would pass every case.
  it('reads the registry, its components and their props', () => {
    expect(entries.length).toBeGreaterThanOrEqual(50)
    expect(entries.filter(entry => entry.design).length).toBeGreaterThanOrEqual(20)
    expect(entries.filter(entry => !byType.has(entry.type)).map(entry => entry.key)).toEqual([])
    expect(propsOf(resolve(APP, 'components/PageSection/BlogPosts.vue')).declared).toContain('colorScheme')
    // webside's slider band declares only `products`; the rest reach the platform's band it wraps.
    expect(drawnBy(resolve(APP, 'components/variants/webside/PageSection/ProductsSliderBand.vue'), ['products', 'heading', 'colorScheme'])).toEqual(['products', 'heading', 'colorScheme'])
  })

  // A design's list is in `editor.designSettings` of the block; the platform's component draws every setting.
  it.each(entries.map(entry => [entry.key, entry] as const))('%s: the form offers what the component draws', (key, { type, design, file }) => {
    const definition = byType.get(type)!
    const offered = builderSettingsFields(definition).map(field => field.path)
    const shown = builderSettingsFields(definition, design).map(field => field.path)

    expect(shown, `the settings form of ${key} (expected: what its component draws)`).toEqual(drawnBy(file, offered))
  })

  it('reads no setting through the attributes that fall through, which the rule cannot follow', () => {
    expect(entries.filter(entry => propsOf(entry.file).attrs).map(entry => entry.key)).toEqual([])
  })

  it('declares the settings of a design only where that design draws the block with its own component', () => {
    const stray = definitions.flatMap(block => Object.keys(block.editor.designSettings ?? {})
      .filter(design => !hasVariant(block.type, design))
      .map(design => `${block.type}@${design}`))

    expect(stray).toEqual([])
  })
})
