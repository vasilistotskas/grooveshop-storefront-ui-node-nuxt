/** What a catalogue entry can be: a section of a page, or a block inside a section or another block. */
export const BLOCK_KINDS = ['section', 'block'] as const

/** What a setting that names another record refers to; Django checks the record exists. */
export const BLOCK_REF_KINDS = ['product', 'category', 'blogCategory', 'page', 'media', 'menu'] as const

/**
 * How deep a document nests: a section is level 1, a block inside it 2,
 * a block inside that block 3. Django enforces the same cap on save.
 */
export const BUILDER_MAX_NODE_DEPTH = 3

/** A section or block id in a document (and a key of its `sections` / `blocks` maps). */
export const BUILDER_NODE_ID_PATTERN = /^[\w-]{1,64}$/

/** A block's type name: lower snake case, as the page-config section types are. */
export const BLOCK_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/

/** A node's `type`: `<block type>@<version>`. */
export const VERSIONED_BLOCK_TYPE_PATTERN = /^([a-z][a-z0-9_]*)@([1-9]\d*)$/

/** The kinds of document: a page or a template of pages, the theme, a section group (header, footer). */
export const BUILDER_DOCUMENT_KINDS = ['page', 'template', 'theme', 'group'] as const

/** The node id the translation overlay uses for a document's own (root) settings. */
export const BUILDER_DOCUMENT_NODE_ID = '@document'
