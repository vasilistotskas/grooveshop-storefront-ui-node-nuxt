/**
 * A builder document's key, as Django names them (`builder/models.py`,
 * `_KEY_PATTERNS`): the theme, a section group, a template of a page type,
 * or a page the store made.
 */
export const BUILDER_DOCUMENT_KEY_PATTERN = /^(?:theme|(?:group|template|page):[a-z0-9][a-z0-9_-]{0,63})$/

/** Django's largest page of a list (`core/pagination/page_number.py`, `max_page_size`). */
export const BUILDER_DOCUMENTS_PAGE_SIZE = 100

/** The document the editor opens on when the address names none: the home page's template. */
export const BUILDER_EDITOR_HOME_DOCUMENT = 'template:home'

/**
 * The section groups the editor shows around every page, in the order the
 * storefront draws them, and the block `groups` name each one takes.
 */
export const BUILDER_EDITOR_GROUPS = ['header', 'mobile', 'footer'] as const

/** The groups drawn below the page's own sections; the others are above them. */
export const BUILDER_EDITOR_GROUPS_BELOW_PAGE: readonly (typeof BUILDER_EDITOR_GROUPS)[number][] = ['footer']

/** The outline pane's width in CSS pixels: what it opens at, and how far it may be dragged. */
export const BUILDER_OUTLINE_PANE = { min: 240, default: 280, max: 420 } as const

/**
 * The widths the preview is drawn at, in CSS pixels; `full` fills the pane.
 * Phone and tablet are the narrowest common viewports of each class, so a
 * layout that holds there holds above.
 */
export const BUILDER_PREVIEW_DEVICES = {
  phone: 360,
  tablet: 768,
  desktop: 1280,
  full: null,
} as const satisfies Record<string, number | null>

/** The address-bar parameters the editor keeps its view in, so a reload or Back restores it. */
export const BUILDER_EDITOR_QUERY = {
  document: 'doc',
  node: 'node',
  locale: 'locale',
  device: 'device',
} as const

/** The editor's route, without a locale prefix (`app/pages/_builder.vue`; Django's admin sends staff here). */
export const BUILDER_EDITOR_ROUTE = '/_builder'

/** How long the editor waits after the last change before it saves the working copy, in milliseconds. */
export const BUILDER_AUTOSAVE_DELAY_MS = 1000

/**
 * The waits between attempts when a save got no answer or a 5xx, in
 * milliseconds. After the last one the editor stops and offers to try again.
 */
export const BUILDER_AUTOSAVE_RETRY_MS = [2000, 5000, 15000, 30000] as const

/** The most steps undo walks back in one editing session. */
export const BUILDER_HISTORY_LIMIT = 100

/** How long before the staff session ends the editor warns, in milliseconds (the token is never renewed). */
export const BUILDER_SESSION_WARNING_MS = 10 * 60 * 1000

/** The prefix of the browser storage key that keeps unsaved changes when a save could not be made. */
export const BUILDER_RECOVERY_STORAGE_PREFIX = 'builder-recovery'

/** A text setting that may hold this many characters or more is edited in a textarea, not a single line. */
export const BUILDER_TEXTAREA_MIN_LENGTH = 300

/** A choice of this many options or fewer is drawn as buttons side by side; more, as a menu. */
export const BUILDER_SEGMENTED_CHOICE_MAX = 3

/** Typing into one setting within this many milliseconds is one step of the undo history. */
export const BUILDER_HISTORY_COALESCE_MS = 1000

/** The settings pane's width in CSS pixels: what it opens at, and how far it may be dragged. */
export const BUILDER_SETTINGS_PANE = { min: 300, default: 340, max: 480 } as const
