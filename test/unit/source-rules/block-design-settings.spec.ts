import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileScript } from 'vue/compiler-sfc'
import { builderSettingsFields } from '~/utils/builderSettingsFields'
import type { BlockDefinition } from '~~/shared/types/builder'
import { APP, parseScript, parseSfc, propertyOf, readSource, walkAst } from '../../helpers/sourceText'
import type { AstNode } from '../../helpers/sourceText'

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
 * A component that hands its props on whole (`heroImage(props)`,
 * `v-bind="props"`) is taken to read every prop it declares: where they go
 * from there is the receiver's business. A render test could not do better
 * without a valid value of every kind of setting per block, live data for each
 * query and a breakpoint per phone-only setting, and a setting it failed to
 * vary would pass as "drawn"; the compiler's view needs none of that and covers
 * every registry entry, the base ones included.
 *
 * Settings only: a child block's form, drawn by its parent's component through
 * a list prop (`childList`), is not checked here.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../app/blocks/*.block.ts', { eager: true })
const definitions = Object.values(modules).map(({ default: block }) => block)
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

/** The settings of the block the component draws: declared and read. */
function drawnBy(file: string, offered: readonly string[]): string[] {
  const { declared, read } = propsOf(file)
  return offered.filter(setting => declared.includes(setting) && (read === 'every' || read.has(setting)))
}

describe('the settings form of each design', () => {
  // A canary: reading nothing would pass every case.
  it('reads the registry, its components and their props', () => {
    expect(entries.length).toBeGreaterThanOrEqual(50)
    expect(entries.filter(entry => entry.design).length).toBeGreaterThanOrEqual(20)
    expect(entries.filter(entry => !byType.has(entry.type)).map(entry => entry.key)).toEqual([])
    expect(propsOf(resolve(APP, 'components/PageSection/BlogPosts.vue')).declared).toContain('colorScheme')
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
