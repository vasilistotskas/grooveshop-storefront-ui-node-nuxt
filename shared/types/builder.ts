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
  /**
   * The page types a static route of the storefront renders: a layout of one of
   * them is the document `template:<pageType>`, any other is the custom page
   * `page:<pageType>`. A block's `templates` names these.
   */
  templates: string[]
}

/** What a kind of document may carry at its root: a Zod object and which of its settings are translatable. */
export interface DocumentRoot {
  schema: ZodObject
  translatable: readonly SettingsPointer[]
}

// ── The rendered page ──────────────────────────────────────────────

/** One section of a page as the renderer takes it: its block type and the props its component gets (`sectionProps`). */
export interface BuilderSection {
  id: string
  /** The block type, without its version: the section component's key in the registry. */
  componentType: string
  props: Record<string, unknown>
}

/** A published page, parsed and resolved for one language. */
export interface BuilderPage {
  /** The page's own settings: its SEO copy, in the page's language. */
  settings?: Record<string, unknown>
  sections: BuilderSection[]
}

/**
 * What `GET /api/builder/pages/<key>` answers. `page` is `null` when the
 * release has no page or template of that key: the normal state of a page
 * type a store has not built, travelling inside an object so the absent
 * state is data a cache can hold (a bare `null` is a 204, and a thrown 404
 * is never cached).
 */
export interface BuilderPageResponse {
  page: BuilderPage | null
}

/** A page of the current release, as the sitemap lists it. */
export interface PublishedPage {
  /** The page key: a static route's page type, or a custom page's slug. */
  key: string
  kind: 'template' | 'page'
  /** When the page's published version was made: the sitemap's lastmod. */
  updatedAt: string
}
