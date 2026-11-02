import type { BUILDER_EDITOR_GROUPS, BUILDER_PREVIEW_DEVICES } from '../constants/builderEditor'
import type { BUILDER_STAFF_ROLES } from '../constants/builderSession'

/** A section group the editor shows around every page (`group:<name>`). */
export type BuilderEditorGroup = (typeof BUILDER_EDITOR_GROUPS)[number]

/** A width the preview is drawn at. */
export type BuilderPreviewDevice = keyof typeof BUILDER_PREVIEW_DEVICES

/** What a signed-in staff member is in this store (`BUILDER_STAFF_ROLES`). */
export type BuilderStaffRole = (typeof BUILDER_STAFF_ROLES)[number]
