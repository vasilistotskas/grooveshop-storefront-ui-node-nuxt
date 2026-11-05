import type { BUILDER_EDITOR_GROUPS, BUILDER_PREVIEW_DEVICES } from '../constants/builderEditor'
import type { StaffSessionRoleEnum } from '../openapi/types.gen'
import type { BuilderDocument, BuilderPage } from './builder'
import type { NavigationItems } from './navigation'

/** A section group the editor shows around every page (`group:<name>`). */
export type BuilderEditorGroup = (typeof BUILDER_EDITOR_GROUPS)[number]

/**
 * A page of the page builder rather than of the store: the editor itself
 * (`/_builder`), a store page drawn as the editor's preview (its canvas,
 * `BUILDER_CANVAS_QUERY`), or a share-preview link opened (`share`: the
 * store's page drawn from drafts, for someone without an account). None is a
 * shopper's visit.
 */
export type BuilderSurface = 'editor' | 'canvas' | 'share'

/** A width the preview is drawn at. */
export type BuilderPreviewDevice = keyof typeof BUILDER_PREVIEW_DEVICES

/** What a signed-in staff member is in this store, as the staff session states it. */
export type BuilderStaffRole = StaffSessionRoleEnum

/** A working copy's per-language overlay: `overlay[locale][node id][JSON pointer]` (`ZodBuilderOverlay`). */
export type BuilderOverlay = Record<string, Record<string, Record<string, unknown>>>

/**
 * What `POST /api/builder/preview` answers: each page or template asked
 * for, ready to render as `/api/builder/pages/<key>` answers a published
 * one, and the store's menus with the section groups asked for in place of
 * the published ones, as `/api/builder/navigation` answers them.
 */
export interface BuilderPreviewResponse {
  pages: Record<string, BuilderPage>
  navigation: NavigationItems
}

/** A document as the editor changes it: the draft and its overlay, saved together. */
export interface BuilderWorkingCopy {
  draft: BuilderDocument
  i18n: BuilderOverlay
}
