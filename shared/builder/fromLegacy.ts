import type { BlockDefinition, BuilderDocument, BuilderDocumentKind, BuilderNode, DocumentRoot } from '../types/builder'
import { BUILDER_DOCUMENT_NODE_ID } from '../constants/builder'
import { formatVersionedType } from './upgrade'

/**
 * The import of `page_config` into builder documents, in one place and pure:
 * Django sends a legacy layout as it stores it, this answers the document and
 * the translation overlay it becomes. There is no second copy of the rules.
 *
 * It is driven by the block definitions alone, so a block needs no conversion
 * code of its own:
 * - a prop that is a list of objects and that the block feeds from child
 *   blocks (`childList`) becomes those children, in the declaration order of
 *   `childList`, each with the same rule one level down;
 * - any other prop the block has a setting for becomes that setting, camelCased;
 * - anything else is dropped with a warning (a prop no component reads).
 */

export interface LegacySection {
  /** `PageSection.uuid`: the node's id. */
  id: string
  type: string
  title: string
  isVisible: boolean
  /** As stored: snake_case keys. */
  props: Record<string, unknown>
  /** As stored: `{ locale: { title?, props?: partial } }`, the default language absent. */
  i18n?: Record<string, { title?: string, props?: Record<string, unknown> }>
}

export interface LegacyLayout {
  /** SEO copy per language, the default included. */
  seo?: Record<string, Record<string, unknown>>
  sections: readonly LegacySection[]
}

export interface LegacyWarning {
  code: 'dropped_setting' | 'dropped_title' | 'dropped_override' | 'list_length_mismatch' | 'invalid_list'
  path: string
  message: string
}

export interface LegacyError {
  path: string
  code: 'unknown_block_type' | 'invalid_settings'
  message: string
}

/** The overlay as Django stores it: `locale -> node id -> pointer -> value`. */
export type BuilderOverlay = Record<string, Record<string, Record<string, unknown>>>

export interface ConvertedLayout {
  document: BuilderDocument
  i18n: BuilderOverlay
  warnings: LegacyWarning[]
}

/** The layout cannot be converted; every reason is listed. */
export class LegacyConvertError extends Error {
  constructor(readonly errors: readonly LegacyError[]) {
    super(errors.map(({ path, message }) => `${path}: ${message}`).join('; '))
    this.name = 'LegacyConvertError'
  }
}

type Registry = ReadonlyMap<string, BlockDefinition>
type Overrides = Record<string, Record<string, unknown>>

interface Context {
  registry: Registry
  overlay: BuilderOverlay
  warnings: LegacyWarning[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** `cta_text` as `ctaText`: what DRF's camel-case renderer does to a key. */
export const camelKey = (key: string): string => key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())

function camelizeDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeDeep)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [camelKey(key), camelizeDeep(inner)]))
}

const camelProps = (props: unknown): Record<string, unknown> =>
  isRecord(props) ? Object.fromEntries(Object.entries(props).map(([key, value]) => [camelKey(key), value])) : {}

function put(overlay: BuilderOverlay, locale: string, id: string, pointer: string, value: unknown) {
  ((overlay[locale] ??= {})[id] ??= {})[pointer] = value
}

/**
 * One node and its children. `overrides` is, per language, the partial props
 * a translation set for this node: its translatable settings go to the overlay
 * under `id`, and a translated list is handed to the children by position.
 */
function convertNode(
  context: Context,
  definition: BlockDefinition,
  id: string,
  rawProps: unknown,
  rawOverrides: Overrides,
  path: string,
  into: BuilderNode,
): void {
  const props = camelProps(rawProps)
  const overrides = Object.fromEntries(Object.entries(rawOverrides).map(([locale, partial]) => [locale, camelProps(partial)]))
  const lists = Object.entries(definition.childList) // [child type, list prop]
  const listProps = new Set(lists.map(([, list]) => list))
  const shape = definition.schema.shape

  const settings: Record<string, unknown> = {}
  for (const key of Object.keys(shape)) {
    if (key in props) settings[key] = camelizeDeep(props[key])
  }
  for (const key of Object.keys(props)) {
    if (!(key in shape) && !listProps.has(key)) {
      context.warnings.push({ code: 'dropped_setting', path: `${path}/${key}`, message: `${definition.type} has no setting "${key}"; it was dropped` })
    }
  }
  into.settings = { ...into.settings, ...settings }

  let count = 0
  const blocks: Record<string, BuilderNode> = {}
  const blockOrder: string[] = []
  for (const [childType, list] of lists) {
    const items: unknown = props[list]
    if (items === undefined) continue
    const childDefinition = context.registry.get(childType)!
    if (!Array.isArray(items)) {
      context.warnings.push({ code: 'invalid_list', path: `${path}/${list}`, message: `"${list}" is not a list; it was dropped` })
      continue
    }
    items.forEach((item: unknown, index) => {
      if (!isRecord(item)) {
        context.warnings.push({ code: 'invalid_list', path: `${path}/${list}/${index}`, message: 'a list entry is not an object; it was dropped' })
        return
      }
      count += 1
      const childId = `${id}-${count}`
      const childOverrides: Overrides = {}
      for (const [locale, partial] of Object.entries(overrides)) {
        const translated: unknown = partial[list]
        if (Array.isArray(translated) && isRecord(translated[index])) childOverrides[locale] = translated[index]
      }
      const child: BuilderNode = { type: formatVersionedType(childDefinition.type, childDefinition.version), settings: {} }
      convertNode(context, childDefinition, childId, item, childOverrides, `${path}/${list}/${index}`, child)
      blocks[childId] = child
      blockOrder.push(childId)
    })
  }
  if (blockOrder.length > 0) {
    into.blocks = blocks
    into.blockOrder = blockOrder
  }

  for (const [locale, partial] of Object.entries(overrides)) {
    for (const [key, value] of Object.entries(partial)) {
      if (listProps.has(key)) {
        const own = props[key]
        if (Array.isArray(value) && Array.isArray(own) && value.length !== own.length) {
          context.warnings.push({ code: 'list_length_mismatch', path: `${path}/${key}`, message: `the ${locale} translation of "${key}" has ${value.length} entries, the default ${own.length}; matched by position` })
        }
      }
      else if (key in shape && definition.translatable.includes(`/${key}`)) {
        continue
      }
      else {
        context.warnings.push({ code: 'dropped_override', path: `${path}/${key}`, message: `the ${locale} translation of "${key}" is not translatable; it was dropped` })
      }
    }
    // In the declared order of the block's translatable settings, so the answer is stable.
    for (const pointer of definition.translatable) {
      const key = pointer.slice(1)
      if (key in partial && !listProps.has(key)) put(context.overlay, locale, id, pointer, camelizeDeep(partial[key]))
    }
  }
}

/** A legacy section as a node, with its overlay and warnings added to `context`. */
function convertSection(context: Context, section: LegacySection): BuilderNode {
  const definition = context.registry.get(section.type)
  const path = `/sections/${section.id}`
  if (!definition?.kinds.includes('section')) {
    throw new LegacyConvertError([{ path, code: 'unknown_block_type', message: `"${section.type}" is not a section the storefront has a block for` }])
  }
  const node: BuilderNode = { type: formatVersionedType(definition.type, definition.version), settings: {} }
  if (!section.isVisible) node.disabled = true

  const props: Record<string, unknown> = { ...section.props }
  const overrides: Overrides = {}
  for (const [locale, translation] of Object.entries(section.i18n ?? {})) {
    if (isRecord(translation?.props)) overrides[locale] = { ...translation.props }
  }
  // The section's own title is a setting only where the block reads one.
  if ('title' in definition.schema.shape) {
    if (section.title) props.title = section.title
    for (const [locale, translation] of Object.entries(section.i18n ?? {})) {
      if (translation?.title) overrides[locale] = { ...overrides[locale], title: translation.title }
    }
  }
  else if (section.title || Object.values(section.i18n ?? {}).some(translation => translation?.title)) {
    context.warnings.push({ code: 'dropped_title', path: `${path}/title`, message: `${definition.type} does not read a title; it was dropped` })
  }
  convertNode(context, definition, section.id, props, overrides, path, node)
  return node
}

function checkSettings(registry: Registry, node: BuilderNode, path: string, errors: LegacyError[]) {
  const definition = registry.get(node.type.split('@')[0]!)!
  const parsed = definition.schema.safeParse(node.settings)
  if (!parsed.success) {
    errors.push({ path: `${path}/settings`, code: 'invalid_settings', message: parsed.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ') })
  }
  for (const [id, child] of Object.entries(node.blocks ?? {})) {
    checkSettings(registry, child, `${path}/blocks/${id}`, errors)
  }
}

/**
 * A legacy layout (a page or a template) as a document: its sections in order,
 * the page's own SEO copy as the document's `settings`, and everything a
 * translation set in `i18n` (the overlay, the document root under `@document`).
 *
 * All or nothing: a section of a type with no block, or whose converted
 * settings fail their block's own schema, fails the layout with every reason.
 */
export function convertLegacyLayout(
  layout: LegacyLayout,
  options: {
    kind: BuilderDocumentKind
    defaultLocale: string
    registry: Registry
    roots: Partial<Record<BuilderDocumentKind, DocumentRoot>>
  },
): ConvertedLayout {
  const context: Context = { registry: options.registry, overlay: {}, warnings: [] }
  const errors: LegacyError[] = []

  const sections: Record<string, BuilderNode> = {}
  const order: string[] = []
  for (const section of layout.sections) {
    try {
      sections[section.id] = convertSection(context, section)
      order.push(section.id)
    }
    catch (error) {
      if (!(error instanceof LegacyConvertError)) throw error
      errors.push(...error.errors)
    }
  }
  for (const [id, node] of Object.entries(sections)) checkSettings(options.registry, node, `/sections/${id}`, errors)

  const document: BuilderDocument = { sections, order }
  const root = options.roots[options.kind]
  if (root) {
    const fields = Object.keys(root.schema.shape)
    const seoOf = (locale: string) => {
      const own = camelProps(layout.seo?.[locale])
      return Object.fromEntries(fields.flatMap(field => (typeof own[field] === 'string' && own[field] ? [[field, own[field]]] : [])))
    }
    const settings = seoOf(options.defaultLocale)
    if (Object.keys(settings).length > 0) document.settings = settings
    for (const locale of Object.keys(layout.seo ?? {}).sort()) {
      if (locale === options.defaultLocale) continue
      const translated = seoOf(locale)
      for (const pointer of root.translatable) {
        const field = pointer.slice(1)
        if (field in translated) put(context.overlay, locale, BUILDER_DOCUMENT_NODE_ID, pointer, translated[field])
      }
    }
  }

  if (errors.length > 0) throw new LegacyConvertError(errors)
  const i18n = Object.fromEntries(Object.keys(context.overlay).sort().map(locale => [locale, context.overlay[locale]!]))
  return { document: { ...(document.settings && { settings: document.settings }), sections, order }, i18n, warnings: context.warnings }
}
