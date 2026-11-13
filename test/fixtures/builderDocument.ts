import type { DocumentList } from '~~/shared/openapi/types.gen'
import { parseBuilderDocumentKey } from '~~/shared/utils/builderEditor'

/**
 * A builder document as the editor's list serves it (`GET /api/builder/documents`,
 * `DocumentList`), valid against the generated `zDocumentList` (proved by
 * `test/unit/fixtures/builderDocument.spec.ts`).
 *
 * Defaults: the home page's template at revision 3, published once, with no
 * changes since. The kind follows the key (`group:footer` is a group), so the
 * two never disagree; an explicit override wins.
 */
export function makeBuilderDocumentRow(overrides: Partial<DocumentList> = {}): DocumentList {
  const key = overrides.key ?? 'template:home'
  return {
    key,
    kind: parseBuilderDocumentKey(key).kind,
    draftRevision: 3,
    updatedAt: '2026-11-02T10:00:00+02:00',
    updatedBy: null,
    publishedVersion: 1,
    hasUnpublishedChanges: false,
    ...overrides,
  }
}
