import type { ContentPageDetail } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `ContentPageDetail` (what `/api/content-pages/<slug>` wraps as
 * `{ page }`) valid against the generated `zContentPageDetail` (proved
 * by `test/unit/fixtures/contentPage.spec.ts`).
 *
 * Defaults: page 1, published at `FIXTURE_TIMESTAMP`, with an `el`
 * title and body. `uuid` and `slug` follow `id`; `translations`
 * replaces the whole block.
 */
export function makeContentPage(overrides: Partial<ContentPageDetail> = {}): ContentPageDetail {
  const id = overrides.id ?? 1

  return {
    id,
    uuid: fixtureUuid(21, id),
    slug: `page-${id}`,
    translations: { el: { title: `Σελίδα ${id}`, body: '<p>Κείμενο</p>' } },
    isPublished: true,
    publishedAt: FIXTURE_TIMESTAMP,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}
