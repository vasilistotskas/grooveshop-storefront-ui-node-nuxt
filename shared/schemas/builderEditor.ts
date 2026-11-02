import { z } from 'zod'
import type { BuilderNode } from '../types/builder'
import { BUILDER_DOCUMENT_NODE_ID, BUILDER_NODE_ID_PATTERN } from '../constants/builder'
import { BUILDER_DOCUMENT_KEY_PATTERN, BUILDER_PREVIEW_MAX_DOCUMENTS } from '../constants/builderEditor'
import { builderPageKind } from '../utils/builderEditor'

/** `/api/builder/documents/<key>`: a document key as Django names them. */
export const ZodBuilderDocumentParams = z.object({
  key: z.string().regex(BUILDER_DOCUMENT_KEY_PATTERN),
})

const zNodeId = z.string().regex(BUILDER_NODE_ID_PATTERN)

/** Whether `order` names every id of `map` exactly once, as Django requires of a saved document. */
const ordersAll = (map: Record<string, unknown> = {}, order: readonly string[] = []) =>
  order.length === Object.keys(map).length && new Set(order).size === order.length && order.every(id => Object.hasOwn(map, id))

/**
 * A node of a working copy, by its STRUCTURE only: its type, whether it is
 * hidden, its settings as an opaque object, its children. The settings are
 * checked against their block where they are edited, and Django checks the
 * whole node on every save; this is what the editor needs to draw the
 * outline and to move nodes around.
 */
const zDraftNode: z.ZodType<BuilderNode> = z.lazy(() => z.object({
  type: z.string(),
  disabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()),
  blocks: z.record(zNodeId, zDraftNode).optional(),
  blockOrder: z.array(zNodeId).optional(),
}).refine(node => ordersAll(node.blocks, node.blockOrder), { message: 'blockOrder must name every block once' }))

/**
 * A document's working copy (`draft` of `GET documents/<key>`) as the
 * editor opens it. A document that is not this shape (written by a build
 * with another format) is not opened, rather than half-drawn and saved
 * back mangled. Each order lists its map exactly once, as Django's own
 * check of a saved document does.
 */
export const ZodBuilderDraft = z.object({
  settings: z.record(z.string(), z.unknown()).optional(),
  sections: z.record(zNodeId, zDraftNode),
  order: z.array(zNodeId),
}).refine(document => ordersAll(document.sections, document.order), { message: 'order must name every section once' })

/**
 * A working copy's per-language overlay (`i18n` of a document): the
 * translated value of a setting, `i18n[locale][node id][JSON pointer]`, with
 * `@document` as the node id of the document's own settings. Django checks
 * every entry against the catalogue on save.
 */
export const ZodBuilderOverlay = z.record(
  z.string().min(2).max(15),
  z.record(z.union([zNodeId, z.literal(BUILDER_DOCUMENT_NODE_ID)]), z.record(z.string().startsWith('/'), z.unknown())),
)

/** `PUT /api/builder/documents/<key>/draft`: the whole working copy. */
export const ZodBuilderDraftWrite = z.object({
  draft: ZodBuilderDraft,
  i18n: ZodBuilderOverlay,
})

/**
 * `POST /api/builder/preview`: the working copies the editor's preview
 * draws, by document key: the one page or template shown, and the section
 * groups around it.
 */
export const ZodBuilderPreviewRequest = z.object({
  documents: z.record(z.string().regex(BUILDER_DOCUMENT_KEY_PATTERN), ZodBuilderDraftWrite)
    .refine(documents => Object.keys(documents).length <= BUILDER_PREVIEW_MAX_DOCUMENTS, {
      message: `At most ${BUILDER_PREVIEW_MAX_DOCUMENTS} documents`,
    })
    .refine(documents => Object.keys(documents).filter(key => builderPageKind(key)).length === 1, {
      message: 'Exactly one page or template',
    }),
})

/**
 * What Django's `POST builder/preview/resolve` answers: `published/<pageKey>`'s
 * shape, the working copies resolved in place of the release's documents.
 * The documents' content is the storefront's (`parseDocument`), so it is
 * read here as data, as the published reads read it.
 */
export const ZodBuilderPreviewResolved = z.object({
  release: z.number().int(),
  locale: z.string(),
  groups: z.record(z.string(), z.unknown()),
  page: z.unknown(),
})

/** `If-Match` of a draft save: the revision the change is made against, `0` for a document that does not exist yet. */
export const ZodBuilderRevisionHeaders = z.object({
  'if-match': z.string().regex(/^\d{1,10}$/),
})

/** Django's 503 when it cannot check a save against the storefront's catalogue: nothing was saved. */
export const ZodBuilderStorefrontUnavailable = z.object({
  code: z.literal('storefront_unavailable'),
  detail: z.string(),
})
