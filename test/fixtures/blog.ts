import type { BlogCategory, BlogComment } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `BlogComment` as Django serialises it, valid against the generated
 * `zBlogComment` (proved by `test/unit/fixtures/blog.spec.ts`).
 *
 * Defaults: an approved top-level Greek comment by user 1 — the public
 * byline, never an email — with no likes and no replies. `uuid` and the
 * content follow `id`. An explicit override wins.
 */
export function makeBlogComment(overrides: Partial<BlogComment> = {}): BlogComment {
  const id = overrides.id ?? 1
  const content = `Σχόλιο ${id}`

  return {
    id,
    translations: { el: { content } },
    user: { id: 1, username: 'user1', firstName: 'Μαρία', lastName: 'Παπαδοπούλου', mainImagePath: '' },
    contentPreview: content,
    isReply: false,
    parent: null,
    hasReplies: false,
    approved: true,
    isEdited: false,
    likesCount: 0,
    repliesCount: 0,
    userHasLiked: false,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(22, id),
    ...overrides,
  }
}

/**
 * A `BlogCategory` as Django serialises it, valid against the generated
 * `zBlogCategory` (proved by `test/unit/fixtures/blog.spec.ts`).
 *
 * Defaults: a top-level Greek category with one post and no image; the
 * name and slug follow `id`. An explicit override wins.
 */
export function makeBlogCategory(overrides: Partial<BlogCategory> = {}): BlogCategory {
  const id = overrides.id ?? 1

  return {
    id,
    translations: { el: { name: `Κατηγορία ${id}`, description: '' } },
    slug: `category-${id}`,
    parent: null,
    level: 0,
    sortOrder: id,
    postCount: 1,
    hasChildren: false,
    mainImagePath: '',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}
