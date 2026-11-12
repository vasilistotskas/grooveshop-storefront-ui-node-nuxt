import type { BlogAuthorDetail, BlogCategory, BlogComment, BlogCommentDetail, BlogPost, BlogTag } from '~~/shared/openapi/types.gen'
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
 * A `BlogCommentDetail` as Django answers a create, a read or a like toggle
 * of one comment, valid against `zBlogCommentDetail` (proved by
 * `test/unit/fixtures/blog.spec.ts`).
 *
 * Defaults: a reply (comment `id`, by user 1) to comment 1, which has
 * the public author `makeBlogComment` has, and is itself a root: the
 * `parentComment` and every `ancestorsPath` entry carry the PUBLIC author
 * (`id`, `username`, `firstName`, `lastName`, `mainImagePath`), never the
 * account's email or role flags (Django's `comment_response_contract` test).
 * An explicit override wins.
 */
export function makeBlogCommentDetail(overrides: Partial<BlogCommentDetail> = {}): BlogCommentDetail {
  const { user, ...comment } = makeBlogComment({ isReply: true, parent: 1, ...overrides })
  const author = { id: 7, username: 'user7', firstName: 'Νίκος', lastName: 'Αντωνίου', mainImagePath: '' }
  return {
    ...comment,
    user,
    post: makeBlogPost(),
    parentComment: { id: 1, contentPreview: 'Σχόλιο 1', user: author, createdAt: FIXTURE_TIMESTAMP },
    childrenComments: [],
    ancestorsPath: [{ id: 1, contentPreview: 'Σχόλιο 1', user: author }],
    treePosition: { level: 1, treeId: 1, approvedDescendantsCount: 0, siblingsCount: 0 },
    ...overrides,
  }
}

/**
 * A `BlogPost` as the posts list serves it, valid against the generated
 * `zBlogPost` (proved by `test/unit/fixtures/blog.spec.ts`).
 *
 * Defaults: a published Greek post in category 1, by author 1, read in
 * 5 minutes, with no image, likes or comments; the title, slug and uuid
 * follow `id`. An explicit override wins.
 */
export function makeBlogPost(overrides: Partial<BlogPost> = {}): BlogPost {
  const id = overrides.id ?? 1

  return {
    id,
    uuid: fixtureUuid(23, id),
    slug: `post-${id}`,
    translations: { el: { title: `Άρθρο ${id}`, subtitle: '' } },
    author: 1,
    category: 1,
    tags: [],
    featured: false,
    viewCount: 0,
    likesCount: 0,
    commentsCount: 0,
    tagsCount: 0,
    isPublished: true,
    publishedAt: FIXTURE_TIMESTAMP,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    mainImagePath: '',
    readingTime: 5,
    contentPreview: '',
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

/**
 * A `BlogTag` as Django serialises it, valid against the generated
 * `zBlogTag` (proved by `test/unit/fixtures/blog.spec.ts`).
 *
 * Defaults: an active Greek tag with one post; the name and uuid follow
 * `id`. An explicit override wins.
 */
export function makeBlogTag(overrides: Partial<BlogTag> = {}): BlogTag {
  const id = overrides.id ?? 1

  return {
    id,
    translations: { el: { name: `Ετικέτα ${id}` } },
    active: true,
    sortOrder: id,
    postsCount: '1',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(31, id),
    ...overrides,
  }
}

/**
 * A `BlogAuthorDetail` as Django serialises it (an author's page, and the
 * `author` of a post's detail), valid against the generated
 * `zBlogAuthorDetail` (proved by `test/unit/fixtures/blog.spec.ts`).
 *
 * Defaults: an author with a name and no photo, website, public profiles,
 * bio or posts; the uuid and the user follow `id`. An explicit override wins.
 */
export function makeBlogAuthor(overrides: Partial<BlogAuthorDetail> = {}): BlogAuthorDetail {
  const id = overrides.id ?? 1

  return {
    id,
    uuid: fixtureUuid(32, id),
    translations: { el: { bio: '' } },
    user: { id, username: null, firstName: 'Νίκος', lastName: `Συντάκτης ${id}`, mainImagePath: '' },
    website: null,
    sameAs: [],
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    numberOfPosts: 0,
    totalLikesReceived: 0,
    recentPosts: [],
    topPosts: [],
    ...overrides,
  }
}
