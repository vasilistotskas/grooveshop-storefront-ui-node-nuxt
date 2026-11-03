import type { ZodObject } from 'zod'

import type { BLOCK_KINDS, BLOCK_REF_KINDS, BUILDER_DOCUMENT_KINDS, DATA_MISSING, DATA_RECORD_KINDS, DATA_SOURCES, LINK_REF_KINDS, LINK_ROUTES, LINK_SLUG_KINDS } from '../constants/builder'
import type { BlockUpgradeFailure } from '../builder/upgrade'
import type { StoreFeatureName } from '../utils/storeFeature'
import type { BUILDER_BLOCK_CATEGORIES } from '../constants/builderEditor'

export type BlockKind = (typeof BLOCK_KINDS)[number]
export type BlockRefKind = (typeof BLOCK_REF_KINDS)[number]
export type BuilderDocumentKind = (typeof BUILDER_DOCUMENT_KINDS)[number]
export type LinkRefKind = (typeof LINK_REF_KINDS)[number]
export type DataSource = (typeof DATA_SOURCES)[number]
export type DataRecordKind = (typeof DATA_RECORD_KINDS)[number]
export type DataMissing = (typeof DATA_MISSING)[number]

/**
 * What a data setting is and what the page does without its data: a record
 * by id (`ref`) or a list described by a descriptor (`query`). The
 * catalogue states it per setting pointer (`data`).
 */
export type DataDeclaration
  = | { field: 'ref', kind: BlockRefKind, onMissing: DataMissing }
    | { field: 'query', source: DataSource, onEmpty: DataMissing, maxLimit: number }

/** A record a link points at: a numeric id for a product, category, blog post or blog category, a page type or a slug for a page or a content page. */
export type BuilderLinkRef
  = | { kind: Exclude<LinkRefKind, 'page' | 'contentPage'>, id: number }
    | { kind: 'page' | 'contentPage', id: string }

/** A link setting as a document stores it: where it goes, never a typed internal path. */
export type BuilderLink
  = | { href: string }
    | { route: (typeof LINK_ROUTES)[number] }
    | { ref: BuilderLinkRef }

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
  /**
   * The designs that draw it, by the tenant schema the component registry keys
   * a variant by (`<type>@<design>`). None named means every design. A block
   * with a presentation in one design only is declared so: another store's
   * catalogue does not list it, so it is neither offered nor accepted there.
   */
  designs?: readonly string[]
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
  /** What only the editor reads: never part of the catalogue, so it changes nothing Django checks. */
  editor?: BlockEditorConfig
}

/** How the editor presents a block (`BlockConfig.editor`). */
export interface BlockEditorConfig {
  /**
   * The text settings that name a node in the editor's outline, in order:
   * the first one with text wins ("New arrivals" rather than "Product
   * grid"). A node with none of them shows the block's name. Each must be
   * a setting of the schema (`defineBlock` checks).
   */
  title?: readonly string[]
  /** The tab of the add-section library a section is listed under (`BUILDER_BLOCK_CATEGORIES`); a block that only sits inside another has none. */
  category?: (typeof BUILDER_BLOCK_CATEGORIES)[number]
}

/** What `defineBlock` returns: `BlockConfig` with every default filled in. */
export interface BlockDefinition<Schema extends ZodObject = ZodObject> extends BlockConfig<Schema> {
  translatable: readonly SettingsPointer[]
  refs: Readonly<Partial<Record<SettingsPointer, BlockRefKind>>>
  /** The link settings of the schema (`builderField.link()`), derived by `defineBlock`: Django checks the records they name. */
  linkRefs: readonly SettingsPointer[]
  /** The data settings of the schema (`builderField.ref`, `builderField.query`), derived by `defineBlock`. */
  data: Readonly<Record<SettingsPointer, DataDeclaration>>
  limits: BlockLimits
  children: BlockChildren
  childList: Readonly<Record<string, string>>
  editor: BlockEditorConfig
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
  /** Pointers of the link settings: each value is a `{ href }`, a `{ route }` or a `{ ref: { kind, id } }` whose record Django checks. */
  linkRefs: string[]
  /** The data settings, by pointer, when the block has any: a `ref` names one record, a `query` stores a descriptor that Django validates against the schema. */
  data?: Record<string, DataDeclaration>
  limits: BlockLimits
  children: { allowed: string[], maxDepth?: number }
  kinds: BlockKind[]
  groups?: string[]
  templates?: string[]
  feature?: string
  /** The designs that draw it; absent for a block every design draws. */
  designs?: string[]
  deprecated?: boolean
}

/** The settings a kind of document carries at its root (a page's SEO), as the catalogue serves them. */
export interface CatalogueDocumentKind {
  /** JSON Schema (draft 2020-12) of the root settings object; closed. */
  schema: Record<string, unknown>
  /** Pointers into the root settings that may be written per language. */
  translatable: string[]
  /** Pointers of the root's link settings, as a block's `linkRefs`. */
  linkRefs: string[]
  /** The contrast its colours must keep; only the theme has any. Django enforces the `error` rules on publish. */
  contrast?: ContrastRule[]
  /** The root settings a new document of this kind starts with: the theme a new store of the design gets. */
  defaults?: Record<string, unknown>
}

/** The caps a data setting lives under (`DATA_LIMITS`), stated to Django so it holds a document to the numbers the storefront reads with. */
export interface CatalogueDataLimits {
  maxPickedIds: number
  maxFilterIds: number
  maxQueryLimit: number
  maxQueriesPerDocument: number
}

export interface BlockCatalogue {
  hash: string
  blocks: CatalogueBlock[]
  dataLimits: CatalogueDataLimits
  /** Only the kinds that have root settings; any other accepts none. */
  documentKinds: Partial<Record<BuilderDocumentKind, CatalogueDocumentKind>>
  /**
   * The page types a static route of the storefront renders: a layout of one of
   * them is the document `template:<pageType>`, any other is the custom page
   * `page:<pageType>`. A block's `templates` names these.
   */
  templates: string[]
}

/** One side of a contrast rule: a pointer into the document's root settings, or a literal `#RRGGBB`. */
export type ContrastSide = SettingsPointer | `#${string}`

/**
 * A pair of colours that must stand apart, in WCAG 2.2 contrast: at least
 * `min`. An `error` stops a publish (Django, `insufficient_contrast`); a
 * `warning` is the editor's, with a Fix. Catalogue data, so Django needs
 * no theme knowledge beyond comparing two colours.
 */
export interface ContrastRule {
  id: string
  foreground: ContrastSide
  background: ContrastSide
  min: number
  severity: 'error' | 'warning'
}

/** What a kind of document may carry at its root: a Zod object, which of its settings are translatable, and the contrast its colours must keep. */
export interface DocumentRoot {
  schema: ZodObject
  translatable: readonly SettingsPointer[]
  contrast?: readonly ContrastRule[]
  /** The root settings a new document of this kind starts with; only the theme has them. */
  defaults?: Record<string, unknown>
}

// ── Reading a document ─────────────────────────────────────────────

/** Why `parseDocument` left a node out: the code is stable, `detail` says more. */
export type BuilderNodeSkipReason
  = | BlockUpgradeFailure
    | 'invalid_id'
    | 'invalid_node'
    | 'unknown_type'
    | 'wrong_kind'
    | 'not_allowed'
    | 'invalid_settings'
    | 'upgrade_failed'
    | 'feature_disabled'

/** A node `parseDocument` left out, and why. */
export interface BuilderNodeSkip {
  /** Node ids from the document's root (`hero/slide_2`), `@document` for its own settings, empty for the whole document. */
  path: string
  reason: BuilderNodeSkipReason
  detail?: string
}

/** What the store has published: the pages and content pages a menu or a link may point at. */
export interface PublishedTargets {
  /** Page types of the pages in the current release. */
  pages: ReadonlySet<string>
  /** Slugs of the published content pages. */
  contentPages: ReadonlySet<string>
}

/** A record kind a link names by id, whose address needs the record's current slug. */
export type LinkSlugKind = (typeof LINK_SLUG_KINDS)[number]

/** What `resolveLinks` needs to turn a record into its address. */
export interface LinkTargets {
  /** Current slug of each product, category, blog post and blog category the page names. */
  slugs: Readonly<Record<LinkSlugKind, ReadonlyMap<number, string>>>
  published: PublishedTargets
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
