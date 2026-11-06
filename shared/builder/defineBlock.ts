import type { ZodObject } from 'zod'

import {
  BLOCK_KINDS,
  BLOCK_REF_KINDS,
  BLOCK_TYPE_PATTERN,
  BUILDER_DESIGN_PATTERN,
  BUILDER_MAX_NODE_DEPTH,
} from '../constants/builder'
import type { BlockConfig, BlockDefinition, SettingsPointer } from '../types/builder'
import { dataPointers } from './dataPointers'
import { linkPointers } from './linkPointers'

/** A `legacyImages` pointer: a top-level setting (`/imageUrl`), or every entry of a list setting (`/images/*`). */
const LEGACY_IMAGE_POINTER = /^\/[A-Za-z][A-Za-z0-9]*(\/\*)?$/

/**
 * Declares a section or block of the page builder: its settings schema and
 * everything the catalogue, the editor and the renderer need to know about
 * it, in ONE place (`app/blocks/<type>.block.ts`, default export).
 *
 * It checks what a type system cannot, at load, so a malformed
 * declaration stops the build or the first test instead of reaching a
 * store: the type name, the version, the upgrade chain, and that every
 * pointer names a setting the schema has. Defaults are filled in.
 *
 * A definition holds data only, never a component: the server reads every
 * definition to serve the catalogue and to parse documents, and must not
 * bundle the components. The renderer maps `type` to its component on the
 * client (`app/utils/componentRegistry.ts`). What only the editor reads
 * (`editor`) never reaches the catalogue.
 */
export function defineBlock<Schema extends ZodObject>(config: BlockConfig<Schema>): BlockDefinition<Schema> {
  const fail = (message: string): never => {
    throw new Error(`defineBlock(${config.type}): ${message}`)
  }
  const isOneOf = (list: readonly unknown[], value: unknown) => list.includes(value)

  if (!BLOCK_TYPE_PATTERN.test(config.type)) {
    fail('the type must be lower snake case, starting with a letter')
  }
  if (!Number.isInteger(config.version) || config.version < 1) {
    fail('the version must be an integer of 1 or more')
  }
  if (new Set(config.kinds).size !== config.kinds.length || config.kinds.some(kind => !isOneOf(BLOCK_KINDS, kind))) {
    fail(`kinds must be distinct values of ${BLOCK_KINDS.join(', ')}`)
  }

  if (config.designs !== undefined && (config.designs.length === 0 || new Set(config.designs).size !== config.designs.length || config.designs.some(design => !BUILDER_DESIGN_PATTERN.test(design)))) {
    fail('designs, when given, must be a non-empty list of distinct tenant schema names')
  }

  const upgradeFrom = Object.keys(config.upgrade ?? {}).map(Number).sort((a, b) => a - b)
  if (upgradeFrom.some((from, i) => !Number.isInteger(from) || from >= config.version || (i > 0 && from !== upgradeFrom[i - 1]! + 1))) {
    fail(`upgrade must hold consecutive versions below ${config.version}, each turning version n into n + 1`)
  }
  if (upgradeFrom.length > 0 && upgradeFrom.at(-1) !== config.version - 1) {
    fail(`upgrade must end with ${config.version - 1}, the step to version ${config.version}`)
  }

  const settings = new Set(Object.keys(config.schema.shape))
  const pointers = [...(config.translatable ?? []), ...Object.keys(config.refs ?? {})]
  for (const pointer of pointers) {
    const first = pointer.split('/')[1]
    if (!first || !settings.has(first)) {
      fail(`${pointer} names no setting of the schema`)
    }
  }
  const data = dataPointers(config.schema)
  for (const pointer of Object.keys(data)) {
    if ((config.refs ?? {})[pointer as SettingsPointer] !== undefined) {
      fail(`${pointer} is both a data setting and in refs`)
    }
    if ((config.translatable ?? []).some(translatable => translatable === pointer || translatable.startsWith(`${pointer}/`))) {
      fail(`${pointer} is a data setting, which is the same in every language`)
    }
  }
  for (const { from, to, alt, decorative } of config.legacyImages ?? []) {
    const isList = from.endsWith('/*')
    if (!LEGACY_IMAGE_POINTER.test(from) || !LEGACY_IMAGE_POINTER.test(to) || to.endsWith('/*') !== isList) {
      fail(`legacyImages ${from} to ${to}: both name a top-level setting, or both every entry of a list setting`)
    }
    const names = [from, to, alt, decorative].flatMap(pointer => pointer === undefined ? [] : [pointer.split('/')[1]!])
    if (names.some(name => !settings.has(name))) {
      fail(`legacyImages ${from} to ${to} names a setting the schema does not have`)
    }
    if (data[to as SettingsPointer]?.field !== 'ref' || (data[to as SettingsPointer] as { kind: string }).kind !== 'media') {
      fail(`legacyImages: ${to} must be a media reference (builderField.ref('media'))`)
    }
    if (alt !== undefined && isList) {
      fail(`legacyImages ${from}: a list of images has no alt text of its own`)
    }
  }
  for (const kind of Object.values(config.refs ?? {})) {
    if (!isOneOf(BLOCK_REF_KINDS, kind)) {
      fail(`a ref must be one of ${BLOCK_REF_KINDS.join(', ')}`)
    }
  }

  const { maxDepth } = config.children ?? {}
  if (maxDepth !== undefined && (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth >= BUILDER_MAX_NODE_DEPTH)) {
    fail(`children.maxDepth must be an integer from 1 to ${BUILDER_MAX_NODE_DEPTH - 1}: a document nests ${BUILDER_MAX_NODE_DEPTH} levels, this node being one`)
  }
  if (new Set(config.presets?.map(({ id }) => id)).size !== (config.presets?.length ?? 0)) {
    fail('preset ids must be distinct')
  }

  const lists = Object.entries(config.childList ?? {})
  for (const [child, list] of lists) {
    if (!config.children?.allowed.includes(child)) {
      fail(`childList names "${child}", which is not an allowed child`)
    }
    if (!/^[a-z][A-Za-z0-9]*$/.test(list)) {
      fail(`childList "${list}" must be a camelCase prop name`)
    }
  }
  if (new Set(lists.map(([, list]) => list)).size !== lists.length || lists.some(([, list]) => settings.has(list))) {
    fail('childList props must be distinct and not a setting of the schema')
  }

  for (const setting of config.editor?.title ?? []) {
    if (!settings.has(setting)) {
      fail(`editor.title names "${setting}", which is not a setting of the schema`)
    }
  }

  return {
    ...config,
    translatable: config.translatable ?? [],
    refs: config.refs ?? {},
    linkRefs: linkPointers(config.schema),
    data,
    limits: config.limits ?? {},
    children: config.children ?? { allowed: [] },
    childList: config.childList ?? {},
    editor: config.editor ?? {},
  }
}
