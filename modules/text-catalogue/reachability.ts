import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { babelParse, parse } from 'vue/compiler-sfc'
import type { SFCDescriptor } from 'vue/compiler-sfc'

import { DEFAULT_TEXT_VIEW } from '../../shared/constants/textCatalogue.ts'
import { resolveDesign } from '../../shared/theme/design.ts'
import { componentName } from './componentName.ts'

/**
 * Which components a store's storefront renders, decided without running
 * the app.
 *
 * The registries pick what a store draws (`app/utils/variantRegistry.ts`:
 * `page:<key>@<schema>`, `chrome:<slot>@<schema>`, the design layouts;
 * `app/utils/componentRegistry.ts`: page-builder sections
 * `<type>@<schema>`). Their ROOTS are read from the registries' source,
 * so a registered variant is a root of its schema and of no other, and
 * the walk follows every component reference from there: template tags,
 * `<component :is="'Name'">`, `resolveComponent('Name')`, and `.vue`
 * imports, resolved by Nuxt's auto-import naming (the `components`
 * option of `nuxt.config.ts`, which gives the frozen webside tree its
 * `Webside` prefix).
 *
 * Nothing is guessed. A reference the walk cannot place (a tag that is
 * neither a project component nor a known third-party one, a
 * `resolveComponent` of a computed name, an `import()` outside the
 * registries, a registry entry that is not one lazy import) throws, so
 * the build stops instead of silently showing a store another store's
 * texts, or hiding its own.
 */

export interface ComponentDir {
  /** Absolute. */
  path: string
  /** Nuxt's `prefix` of the directory (`Webside`), or empty. */
  prefix: string
}

export interface ReachabilitySource {
  /** `app/`. */
  appDir: string
  /** The `components` option of `nuxt.config.ts`, in order, aliases resolved. */
  componentDirs: readonly ComponentDir[]
}

/** Registry files, relative to `app/`. */
const VARIANT_REGISTRY = 'utils/variantRegistry.ts'
const COMPONENT_REGISTRY = 'utils/componentRegistry.ts'

/**
 * Components that are not in `app/components/`: Nuxt's and Vue's built-ins,
 * Nuxt UI (`U…`), `@nuxtjs/i18n` (`I18nT`), `@comark/nuxt` (`Markdown`) and `@nuxtjs/leaflet`
 * (`L…`). They hold no store text, so the walk stops there; a name that is
 * neither one of these nor under `app/components/` is an error.
 */
const THIRD_PARTY_COMPONENT = /^(?:U[A-Z]\w*|Nuxt[A-Z]\w*|ClientOnly|I18nT|Markdown|LCircleMarker|LMap|LTileLayer|LTooltip|Suspense|Transition|TransitionGroup|Component)$/

type RootNode = NonNullable<NonNullable<SFCDescriptor['template']>['ast']>
type TemplateChildNode = RootNode['children'][number]
type ElementNode = Extract<TemplateChildNode, { tagType: unknown }>

/** A babel node, typed loosely: `@babel/types` is not a dependency. */
interface AstNode {
  type: string
  [key: string]: unknown
}

const isNode = (value: unknown): value is AstNode =>
  typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'

const parseModule = (source: string): AstNode =>
  babelParse(source, { sourceType: 'module', plugins: ['typescript'] }).program as unknown as AstNode

function walk(root: AstNode, visit: (node: AstNode) => void): void {
  visit(root)
  for (const [key, value] of Object.entries(root)) {
    if (key === 'loc' || key.endsWith('Comments')) continue
    if (Array.isArray(value)) {
      for (const child of value) if (isNode(child)) walk(child, visit)
    }
    else if (isNode(value)) {
      walk(value, visit)
    }
  }
}

const nodesIn = (root: AstNode, match: (node: AstNode) => boolean): AstNode[] => {
  const found: AstNode[] = []
  walk(root, (node) => {
    if (match(node)) found.push(node)
  })
  return found
}

const isIdentifier = (value: unknown, name?: string): value is AstNode & { name: string } =>
  isNode(value) && value.type === 'Identifier' && (name === undefined || value.name === name)

const stringValue = (value: unknown): string | undefined =>
  isNode(value) && value.type === 'StringLiteral' && typeof value.value === 'string' ? value.value : undefined

/** `import('…')` calls. */
const dynamicImports = (root: AstNode) =>
  nodesIn(root, node => node.type === 'CallExpression' && isNode(node.callee) && node.callee.type === 'Import')

/** The module specifier a static or dynamic import names, if it is a literal. */
function importSource(node: AstNode): string | undefined {
  if (node.type === 'ImportDeclaration') return stringValue(node.source)
  const [first] = node.arguments as unknown[]
  return stringValue(first)
}

function unwrap(node: unknown): AstNode | undefined {
  let current = node
  while (isNode(current) && ['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(current.type)) {
    current = current.expression
  }
  return isNode(current) ? current : undefined
}

/** Top-level `const` declarations by name (exported or not). */
function declarations(program: AstNode): Map<string, AstNode> {
  const byName = new Map<string, AstNode>()
  for (const statement of program.body as unknown[]) {
    if (!isNode(statement)) continue
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
    if (!isNode(declaration) || declaration.type !== 'VariableDeclaration') continue
    for (const declarator of declaration.declarations as unknown[]) {
      if (isNode(declarator) && isIdentifier(declarator.id)) {
        const init = unwrap(declarator.init)
        if (init) byName.set(declarator.id.name, init)
      }
    }
  }
  return byName
}

function required(declared: Map<string, AstNode>, name: string, file: string): AstNode {
  const node = declared.get(name)
  if (!node) throw new Error(`${file}: expected a top-level \`const ${name}\``)
  return node
}

function objectProperties(object: AstNode, name: string, file: string): Array<{ key: string, value: unknown }> {
  if (object.type !== 'ObjectExpression') throw new Error(`${file}: \`${name}\` must be an object literal`)
  return (object.properties as unknown[]).map((property) => {
    if (!isNode(property) || property.type !== 'ObjectProperty' || property.computed === true) {
      throw new Error(`${file}: \`${name}\` may only hold plain \`'key': value\` entries`)
    }
    const key = isIdentifier(property.key) ? property.key.name : stringValue(property.key)
    if (key === undefined) throw new Error(`${file}: a key of \`${name}\` is not a name or a string`)
    return { key, value: property.value }
  })
}

/**
 * The `.vue` file each entry of an object-literal registry loads. An
 * entry is one lazy `import('…')`, or the name of a top-level constant
 * that is; anything else is an error. Every import node used is added to
 * `consumed`, so the caller can prove no `import()` was left unread.
 */
function registryImports(
  declared: Map<string, AstNode>,
  name: string,
  file: string,
  consumed: Set<AstNode>,
): Map<string, string> {
  const entries = new Map<string, string>()
  for (const { key, value } of objectProperties(required(declared, name, file), name, file)) {
    const holder = isIdentifier(value) ? declared.get(value.name) : isNode(value) ? value : undefined
    const imports = holder ? dynamicImports(holder) : []
    const [only] = imports
    const specifier = only ? importSource(only) : undefined
    if (imports.length !== 1 || !only || specifier === undefined) {
      throw new Error(`${file}: \`${name}['${key}']\` must be exactly one lazy import('…') of a literal path`)
    }
    consumed.add(only)
    entries.set(key, specifier)
  }
  return entries
}

/** A `~/…`, `@/…` or relative `.vue` specifier as an absolute file that exists. */
function resolveVue(specifier: string, from: string, appDir: string): string {
  let file: string
  if (specifier.startsWith('~/') || specifier.startsWith('@/')) file = resolve(appDir, specifier.slice(2))
  else if (specifier.startsWith('.')) file = resolve(dirname(from), specifier)
  else throw new Error(`${from}: cannot place the import '${specifier}' (only ~/, @/ and relative paths)`)
  if (!file.endsWith('.vue') || !existsSync(file)) {
    throw new Error(`${from}: '${specifier}' is not an existing .vue file`)
  }
  return file
}

interface Registries {
  chromeDefaults: Map<string, string>
  pageDefaults: Map<string, string>
  /** `schema` → `key` → file, per kind. */
  chromeVariants: Map<string, Map<string, string>>
  pageVariants: Map<string, Map<string, string>>
  sectionBase: Map<string, string>
  sectionVariants: Map<string, Map<string, string>>
  designLayouts: string[]
  redesignOnlyPages: Set<string>
}

function addVariant(into: Map<string, Map<string, string>>, schema: string, key: string, file: string) {
  const forSchema = into.get(schema) ?? new Map<string, string>()
  forSchema.set(key, file)
  into.set(schema, forSchema)
}

function readRegistries(appDir: string): Registries {
  const variantFile = join(appDir, VARIANT_REGISTRY)
  const componentFile = join(appDir, COMPONENT_REGISTRY)
  const variantProgram = parseModule(readFileSync(variantFile, 'utf8'))
  const componentProgram = parseModule(readFileSync(componentFile, 'utf8'))
  const variantDeclared = declarations(variantProgram)
  const componentDeclared = declarations(componentProgram)

  const variantConsumed = new Set<AstNode>()
  const componentConsumed = new Set<AstNode>()
  const absolute = (file: string) => (specifier: string) => resolveVue(specifier, file, appDir)
  const files = (map: Map<string, string>, file: string) =>
    new Map([...map].map(([key, specifier]) => [key, absolute(file)(specifier)]))

  const chromeDefaults = files(registryImports(variantDeclared, 'chromeDefaults', VARIANT_REGISTRY, variantConsumed), variantFile)
  const pageDefaults = files(registryImports(variantDeclared, 'pageDefaults', VARIANT_REGISTRY, variantConsumed), variantFile)
  const variants = files(registryImports(variantDeclared, 'variants', VARIANT_REGISTRY, variantConsumed), variantFile)
  const sections = files(registryImports(componentDeclared, 'componentRegistry', COMPONENT_REGISTRY, componentConsumed), componentFile)

  for (const [program, consumed, file] of [
    [variantProgram, variantConsumed, VARIANT_REGISTRY],
    [componentProgram, componentConsumed, COMPONENT_REGISTRY],
  ] as const) {
    if (dynamicImports(program).some(node => !consumed.has(node))) {
      throw new Error(`${file}: an import() outside the registries it is read for; the walk cannot place it`)
    }
  }

  const chromeVariants = new Map<string, Map<string, string>>()
  const pageVariants = new Map<string, Map<string, string>>()
  for (const [key, file] of variants) {
    const match = /^(page|chrome):([\w-]+)@(\w+)$/.exec(key)
    if (!match) throw new Error(`${VARIANT_REGISTRY}: variant key '${key}' is not <page|chrome>:<key>@<schema>`)
    const [, kind, name, schema] = match as unknown as [string, 'page' | 'chrome', string, string]
    const defaults = kind === 'chrome' ? chromeDefaults : pageDefaults
    if (!defaults.has(name)) throw new Error(`${VARIANT_REGISTRY}: '${key}' overrides a ${kind} with no default`)
    addVariant(kind === 'chrome' ? chromeVariants : pageVariants, schema, name, file)
  }

  const sectionBase = new Map<string, string>()
  const sectionVariants = new Map<string, Map<string, string>>()
  for (const [key, file] of sections) {
    const [type, schema, ...rest] = key.split('@') as [string, string | undefined, ...string[]]
    if (rest.length > 0 || !/^\w+$/.test(type) || (schema !== undefined && !/^\w+$/.test(schema))) {
      throw new Error(`${COMPONENT_REGISTRY}: section key '${key}' is not <type> or <type>@<schema>`)
    }
    if (schema === undefined) sectionBase.set(type, file)
    else addVariant(sectionVariants, schema, type, file)
  }

  const layouts = objectProperties(required(variantDeclared, 'designLayouts', VARIANT_REGISTRY), 'designLayouts', VARIANT_REGISTRY)
    .map(({ key, value }) => {
      const layout = stringValue(unwrap(value))
      if (layout === undefined) throw new Error(`${VARIANT_REGISTRY}: designLayouts['${key}'] must be a string`)
      return layout
    })

  const redesignOnly = required(variantDeclared, 'REDESIGN_ONLY_PAGES', VARIANT_REGISTRY)
  const listed = redesignOnly.type === 'NewExpression' ? (redesignOnly.arguments as unknown[])[0] : undefined
  if (!isNode(listed) || listed.type !== 'ArrayExpression') {
    throw new Error(`${VARIANT_REGISTRY}: REDESIGN_ONLY_PAGES must be \`new Set([…])\` of string literals`)
  }
  const redesignOnlyPages = new Set((listed.elements as unknown[]).map((element) => {
    const page = stringValue(element)
    if (page === undefined) throw new Error(`${VARIANT_REGISTRY}: REDESIGN_ONLY_PAGES holds a non-literal`)
    return page
  }))
  for (const page of redesignOnlyPages) {
    if (!pageDefaults.has(page)) throw new Error(`${VARIANT_REGISTRY}: REDESIGN_ONLY_PAGES names '${page}', which is not a page`)
  }

  return { chromeDefaults, pageDefaults, chromeVariants, pageVariants, sectionBase, sectionVariants, designLayouts: layouts, redesignOnlyPages }
}

function* vueFilesUnder(dir: string): Generator<string> {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* vueFilesUnder(path)
    else if (entry.name.endsWith('.vue')) yield path
  }
}

const camelize = (value: string) => value.replace(/-(\w)/g, (_, char: string) => char.toUpperCase())
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

/** Nuxt's component names → files. The first directory to claim a file or a name keeps it. */
function componentNames(componentDirs: readonly ComponentDir[]): Map<string, string> {
  const names = new Map<string, string>()
  const claimed = new Set<string>()
  for (const dir of componentDirs) {
    for (const file of vueFilesUnder(dir.path)) {
      if (claimed.has(file)) continue
      claimed.add(file)
      const name = dir.prefix + componentName(relative(dir.path, file).split(sep).join('/'))
      if (!names.has(name)) names.set(name, file)
    }
  }
  return names
}

interface References {
  files: Set<string>
  /** Names that are neither a project component nor a third-party one. */
  unplaced: Set<string>
}

/** Every file a component refers to, from its template and its scripts. */
function referencesOf(file: string, appDir: string, names: Map<string, string>): References {
  const { descriptor, errors } = parse(readFileSync(file, 'utf8'), { filename: file })
  if (errors.length > 0) throw new Error(`${file}: ${errors[0]!.message}`)
  const refs: References = { files: new Set(), unplaced: new Set() }

  // `<script setup>` bindings are usable as tags (`import Foo from './Foo.vue'`,
  // `const { define: DefineList } = createReusableTemplate()`): their targets
  // come from the script scan below, so a tag they name is placed.
  const bindings = new Set<string>()
  for (const block of [descriptor.script, descriptor.scriptSetup]) {
    if (!block) continue
    const program = parseModule(block.content)
    for (const node of nodesIn(program, n => n.type === 'ImportSpecifier' || n.type === 'ImportDefaultSpecifier' || n.type === 'VariableDeclarator')) {
      const binder = node.type === 'VariableDeclarator' ? node.id : node.local
      if (isNode(binder)) for (const id of nodesIn(binder, n => n.type === 'Identifier')) bindings.add(capitalize(String(id.name)))
    }
  }

  const refer = (name: string, certain: boolean) => {
    const pascal = capitalize(camelize(name))
    if (bindings.has(pascal)) return
    const target = names.get(pascal) ?? (pascal.startsWith('Lazy') ? names.get(pascal.slice(4)) : undefined)
    if (target) refs.files.add(target)
    else if (certain && !THIRD_PARTY_COMPONENT.test(pascal.replace(/^Lazy(?=[A-Z])/, ''))) refs.unplaced.add(name)
  }

  const visit = (node: TemplateChildNode) => {
    if (node.type !== 1) return
    const element: ElementNode = node
    if (element.tag === 'component') {
      for (const prop of element.props) {
        if (prop.type === 6 && prop.name === 'is' && prop.value) refer(prop.value.content, false)
        else if (prop.type === 7 && prop.name === 'bind' && prop.arg && 'content' in prop.arg && prop.arg.content === 'is' && prop.exp && 'content' in prop.exp) {
          // A bound `is` names a component through a value the scripts define
          // (`resolveComponent`, an import, a registry); only its literals are read here.
          for (const literal of nodesIn(parseModule(`(${String(prop.exp.content)})`), n => n.type === 'StringLiteral')) {
            refer(String(literal.value), false)
          }
        }
      }
    }
    else if (element.tagType === 1) {
      refer(element.tag, true)
    }
    for (const child of element.children) visit(child)
  }
  for (const child of descriptor.template?.ast?.children ?? []) visit(child)

  for (const block of [descriptor.script, descriptor.scriptSetup]) {
    if (!block) continue
    const program = parseModule(block.content)
    for (const node of nodesIn(program, n => n.type === 'ImportDeclaration' || (n.type === 'CallExpression' && isNode(n.callee) && n.callee.type === 'Import'))) {
      const source = importSource(node)
      if (source?.endsWith('.vue')) refs.files.add(resolveVue(source, file, appDir))
    }
    for (const call of nodesIn(program, n => n.type === 'CallExpression' && isIdentifier(n.callee, 'resolveComponent'))) {
      const [first] = call.arguments as unknown[]
      const name = stringValue(first)
      if (name === undefined) {
        throw new Error(`${file}: resolveComponent() of a computed name; the walk cannot place it`)
      }
      refer(name, true)
    }
  }
  return refs
}

/**
 * The `.vue` files each view renders, keyed `default` (a store with no
 * variant tree) and by schema for every schema a registry names.
 */
export function reachableFiles(source: ReachabilitySource): Map<string, ReadonlySet<string>> {
  const { appDir } = source
  const registries = readRegistries(appDir)
  const names = componentNames(source.componentDirs)

  const schemas = new Set([
    ...registries.chromeVariants.keys(),
    ...registries.pageVariants.keys(),
    ...registries.sectionVariants.keys(),
  ])

  const references = new Map<string, References>()
  const unplaced: string[] = []
  const scan = (dir: string) => {
    for (const file of vueFilesUnder(dir)) {
      const refs = referencesOf(file, appDir, names)
      references.set(file, refs)
      for (const name of refs.unplaced) unplaced.push(`${relative(appDir, file).split(sep).join('/')}: <${name}>`)
    }
  }
  scan(appDir)
  if (unplaced.length > 0) {
    throw new Error(`The text catalogue cannot place these components (not under app/components/, and not in THIRD_PARTY_COMPONENT):\n  ${unplaced.join('\n  ')}`)
  }

  // A variant tree no registry names is rendered by nobody.
  for (const file of references.keys()) {
    const tree = /(?:^|\/)variants\/(\w+)\//.exec(relative(join(appDir, 'components'), file).split(sep).join('/'))
    if (tree && !schemas.has(tree[1]!)) {
      throw new Error(`${relative(appDir, file)} is in the variant tree of "${tree[1]}", which no registry names`)
    }
  }

  const shellFiles = [
    join(appDir, 'app.vue'),
    join(appDir, 'error.vue'),
    ...vueFilesUnder(join(appDir, 'pages')),
  ].filter(file => existsSync(file))

  const layoutFiles = (designed: boolean) =>
    [...vueFilesUnder(join(appDir, 'layouts'))].filter(file =>
      designed || !registries.designLayouts.includes(file.slice(file.lastIndexOf(sep) + 1, -'.vue'.length)),
    )

  const rootsOf = (schema: string | null): string[] => {
    const designed = schema === null || resolveDesign(schema) !== null
    const chrome = schema ? registries.chromeVariants.get(schema) : undefined
    const pages = schema ? registries.pageVariants.get(schema) : undefined
    const sections = schema ? registries.sectionVariants.get(schema) : undefined
    return [
      ...shellFiles,
      ...layoutFiles(designed),
      ...[...registries.chromeDefaults].map(([key, file]) => chrome?.get(key) ?? file),
      ...[...registries.pageDefaults]
        .filter(([key]) => designed || !registries.redesignOnlyPages.has(key))
        .map(([key, file]) => pages?.get(key) ?? file),
      ...[...new Set([...registries.sectionBase.keys(), ...(sections?.keys() ?? [])])]
        .map(type => sections?.get(type) ?? registries.sectionBase.get(type)!),
    ]
  }

  const views = new Map<string, ReadonlySet<string>>()
  for (const [view, schema] of [[DEFAULT_TEXT_VIEW, null], ...[...schemas].sort().map(name => [name, name] as const)] as const) {
    const reached = new Set<string>()
    const queue = rootsOf(schema)
    for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
      if (reached.has(file)) continue
      reached.add(file)
      queue.push(...references.get(file)!.files)
    }
    views.set(view, reached)
  }
  return views
}
