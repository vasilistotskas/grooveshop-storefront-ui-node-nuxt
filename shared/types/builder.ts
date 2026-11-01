import type { ZodObject } from 'zod'

import type { BLOCK_KINDS, BLOCK_REF_KINDS, BUILDER_DOCUMENT_KINDS } from '../constants/builder'
import type { StoreFeatureName } from '../utils/storeFeature'

export type BlockKind = (typeof BLOCK_KINDS)[number]
export type BlockRefKind = (typeof BLOCK_REF_KINDS)[number]
export type BuilderDocumentKind = (typeof BUILDER_DOCUMENT_KINDS)[number]

/** A JSON pointer into a block's `settings`, e.g. `/title`. */
export type SettingsPointer = `/${string}`

// ── The document ───────────────────────────────────────────────────

/**
 * A section of a page, or a block inside one. `settings` is the block's
 * own data; `blocks` and `blockOrder` hold its children (the map is the
 * data, the order is the layout).
 */
export interface BuilderNode {
  /** `<block type>@<version>`. */
  type: string
  disabled?: boolean
  settings: Record<string, unknown>
  blocks?: Record<string, BuilderNode>
  blockOrder?: string[]
}

/** A node without its type: what an upgrade function reads and returns. */
export type BuilderNodeBody = Omit<BuilderNode, 'type'>

/** One page, template, section group or the theme: the sections by id, and their order. */
export interface BuilderDocument {
  /** The document's own settings (a page's SEO), when its kind has any. */
  settings?: Record<string, unknown>
  sections: Record<string, BuilderNode>
  order: string[]
}

// ── The definition ─────────────────────────────────────────────────

/**
 * Turns a node written for version `n` into one for version `n + 1`.
 * Pure: it gets a copy and returns the new body.
 */
export type BlockUpgrade = (body: BuilderNodeBody) => BuilderNodeBody

export interface BlockLimits {
  /** Most children one node of this type holds. */
  maxBlocks?: number
  /** Most nodes of this type one template holds. */
  maxPerTemplate?: number
}

export interface BlockChildren {
  /** The types that may sit inside this one (each a `block`). */
  allowed: readonly string[]
  /** How many levels may nest below it, counted down from this node. */
  maxDepth?: number
}

/** A ready-made starting point the editor offers when adding this block. */
export interface BlockPreset {
  id: string
  settings?: Record<string, unknown>
  blocks?: ReadonlyArray<{ type: string, settings?: Record<string, unknown> }>
}

export interface BlockConfig<Schema extends ZodObject = ZodObject> {
  /** Lower snake case; the part of a node's `type` before the `@`. */
  type: string
  /** The version the schema describes; bumped by a breaking change. */
  version: number
  /** Where it may sit: as a section of a page, or as a block inside another. */
  kinds: readonly [BlockKind, ...BlockKind[]]
  /** The settings: a closed object, converted to JSON Schema for the catalogue. */
  schema: Schema
  /** Settings a store may write per language (JSON pointers into `settings`). */
  translatable?: readonly SettingsPointer[]
  /** Settings that name another record, by pointer. */
  refs?: Readonly<Partial<Record<SettingsPointer, BlockRefKind>>>
  limits?: BlockLimits
  children?: BlockChildren
  /** Editor library groups it is listed in. */
  groups?: readonly string[]
  /** Templates it may be added to; none named means every one. */
  templates?: readonly string[]
  /** The store feature that must be on for a store to use it. */
  feature?: StoreFeatureName
  /** Still renders and upgrades, but the editor no longer offers it. */
  deprecated?: boolean
  /** `upgrade[n]` turns a version `n` node into one for version `n + 1`. */
  upgrade?: Readonly<Record<number, BlockUpgrade>>
  presets?: readonly BlockPreset[]
  /**
   * How a section component gets its children: `childList[childType]` is the
   * list prop that receives that type's settings, in order (`parseDocument`
   * output to `sectionProps`). Every key is an allowed child.
   */
  childList?: Readonly<Record<string, string>>
}

/** What `defineBlock` returns: `BlockConfig` with every default filled in. */
export interface BlockDefinition<Schema extends ZodObject = ZodObject> extends BlockConfig<Schema> {
  translatable: readonly SettingsPointer[]
  refs: Readonly<Partial<Record<SettingsPointer, BlockRefKind>>>
  limits: BlockLimits
  children: BlockChildren
  childList: Readonly<Record<string, string>>
}

// ── The catalogue ──────────────────────────────────────────────────

/** One block as `GET /api/builder/catalogue` serves it (the contract with Django). */
export interface CatalogueBlock {
  type: string
  version: number
  /** The versions Django accepts in a save. */
  accepts: number[]
  /** JSON Schema (draft 2020-12) of the settings object; closed. */
  schema: Record<string, unknown>
  translatable: string[]
  refs: Record<string, BlockRefKind>
  limits: BlockLimits
  children: { allowed: string[], maxDepth?: number }
  kinds: BlockKind[]
  groups?: string[]
  templates?: string[]
  feature?: string
  deprecated?: boolean
}

/** The settings a kind of document carries at its root (a page's SEO), as the catalogue serves them. */
export interface CatalogueDocumentKind {
  /** JSON Schema (draft 2020-12) of the root settings object; closed. */
  schema: Record<string, unknown>
  /** Pointers into the root settings that may be written per language. */
  translatable: string[]
}

export interface BlockCatalogue {
  hash: string
  blocks: CatalogueBlock[]
  /** Only the kinds that have root settings; any other accepts none. */
  documentKinds: Partial<Record<BuilderDocumentKind, CatalogueDocumentKind>>
}

/** What a kind of document may carry at its root: a Zod object and which of its settings are translatable. */
export interface DocumentRoot {
  schema: ZodObject
  translatable: readonly SettingsPointer[]
}
