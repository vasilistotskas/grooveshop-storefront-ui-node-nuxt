/** What a catalogue entry can be: a section of a page, or a block inside a section or another block. */
export const BLOCK_KINDS = ['section', 'block'] as const

/** What a setting that names another record refers to; Django checks the record exists. */
export const BLOCK_REF_KINDS = ['product', 'category', 'blogCategory', 'blogPost', 'page', 'contentPage', 'media'] as const

/** The records a link may point at: the reference kinds that have a page of their own. */
export const LINK_REF_KINDS = ['product', 'category', 'blogCategory', 'blogPost', 'page', 'contentPage'] as const

/**
 * How deep a document nests: a section is level 1, a block inside it 2,
 * a block inside that block 3. Django enforces the same cap on save.
 */
export const BUILDER_MAX_NODE_DEPTH = 3

/** A section or block id in a document (and a key of its `sections` / `blocks` maps). */
export const BUILDER_NODE_ID_PATTERN = /^[\w-]{1,64}$/

/** A block's type name: lower snake case. */
export const BLOCK_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/

/** A node's `type`: `<block type>@<version>`. */
export const VERSIONED_BLOCK_TYPE_PATTERN = /^([a-z][a-z0-9_]*)@([1-9]\d*)$/

/** The kinds of document: a page or a template of pages, the theme, a section group (header, footer). */
export const BUILDER_DOCUMENT_KINDS = ['page', 'template', 'theme', 'group'] as const

/** The node id the translation overlay uses for a document's own (root) settings. */
export const BUILDER_DOCUMENT_NODE_ID = '@document'

/**
 * The storefront routes a navigation link may name: the same eight paths
 * Django's `BuiltInRoute` lists, which carry no session and no `robots: false`.
 */
export const NAVIGATION_ROUTES = ['/', '/products', '/blog', '/contact', '/offers', '/gift-cards', '/loyalty-program', '/feedback'] as const

/**
 * The routes a link may name, besides a record: the navigation routes and the
 * two entrances of an account. Each answers on every store and points at no
 * record, so a link to one cannot go stale.
 */
export const LINK_ROUTES = [...NAVIGATION_ROUTES, '/account/login', '/account/signup'] as const

/** The record kinds a link names by id, whose address needs the record's current slug (`GET builder/link-targets`). */
export const LINK_SLUG_KINDS = ['product', 'category', 'blogPost', 'blogCategory'] as const

/** The most ids of one kind `GET builder/link-targets` answers in one call (Django refuses more). */
export const LINK_TARGETS_MAX_IDS = 100

/** The JSON Schema keyword that marks a link setting in a block's schema; `defineBlock` lists the marked ones as `linkRefs`. */
export const LINK_SCHEMA_MARKER = 'x-builder-link'

/**
 * The JSON Schema keyword that marks a data setting (`builderField.ref`,
 * `builderField.query`) in a block's schema. Its value is the declaration
 * (`DataDeclaration`); `defineBlock` lists the marked settings as `data`.
 */
export const DATA_SCHEMA_MARKER = 'x-builder-data'

/** What a `query` data setting reads: the record lists the storefront can resolve for a page. */
export const DATA_SOURCES = ['product', 'blogPost', 'category', 'blogCategory', 'promotion'] as const

/** What a data setting does when the page has nothing to show for it: leave its node out, or hand the component an empty status. */
export const DATA_MISSING = ['hide', 'empty'] as const

/** The caps a descriptor lives under. Django enforces the same numbers from the catalogue's JSON Schema. */
export const DATA_LIMITS = {
  /** Most records one hand-picked list names. */
  maxPickedIds: 24,
  /** Most ids one filter (categories, brands, tags) names. */
  maxFilterIds: 5,
  /** Most records one query returns. */
  maxQueryLimit: 24,
} as const

/** How a list of products may be ordered: each is a field the product list's `ordering_fields` declares. */
export const PRODUCT_ORDERINGS = ['newest', 'mostViewed', 'mostLiked', 'topRated', 'discounted', 'priceAsc', 'priceDesc'] as const

/** How a list of blog posts may be ordered. */
export const BLOG_POST_ORDERINGS = ['newest', 'mostViewed'] as const
