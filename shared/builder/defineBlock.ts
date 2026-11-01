import type { ZodObject } from 'zod'

import {
  BLOCK_HYDRATION_MODES,
  BLOCK_KINDS,
  BLOCK_REF_KINDS,
  BLOCK_TYPE_PATTERN,
  BUILDER_MAX_NODE_DEPTH,
  DEFAULT_BLOCK_HYDRATION,
} from '../constants/builder'
import type { BlockConfig, BlockDefinition } from '../types/builder'

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
 * client (`app/utils/componentRegistry.ts`).
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
  if (config.hydrate !== undefined && !isOneOf(BLOCK_HYDRATION_MODES, config.hydrate)) {
    fail(`hydrate must be one of ${BLOCK_HYDRATION_MODES.join(', ')}`)
  }

  return {
    ...config,
    translatable: config.translatable ?? [],
    refs: config.refs ?? {},
    limits: config.limits ?? {},
    children: config.children ?? { allowed: [] },
    hydrate: config.hydrate ?? DEFAULT_BLOCK_HYDRATION,
  }
}
