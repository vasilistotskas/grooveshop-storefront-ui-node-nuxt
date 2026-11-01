/** What a catalogue entry can be: a section of a page, or a block inside a section or another block. */
export const BLOCK_KINDS = ['section', 'block'] as const

/** What a setting that names another record refers to; Django checks the record exists. */
export const BLOCK_REF_KINDS = ['product', 'category', 'page', 'media', 'menu'] as const

/**
 * When a block's component hydrates, as `componentRegistry.ts` already
 * splits it: `eager` for what leads the page, `visible` when it scrolls
 * into view, `idle` once the browser is idle.
 */
export const BLOCK_HYDRATION_MODES = ['eager', 'visible', 'idle'] as const

/** Hydration of a block that names none. */
export const DEFAULT_BLOCK_HYDRATION = 'visible'

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
