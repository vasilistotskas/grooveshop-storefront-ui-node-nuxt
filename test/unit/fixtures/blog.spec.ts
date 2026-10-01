import { describe, expect, it } from 'vitest'

import { zBlogCategory, zBlogComment } from '~~/shared/openapi/zod.gen'
import { makeBlogCategory, makeBlogComment } from '~~/test/fixtures/blog'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makeBlogComment` replaces the hand-built comments the blog specs
 * carried, whose byline had an `email` the public comment serializer
 * never sends. Parsed strictly, so a stale key fails here and names
 * itself.
 */
describe('makeBlogComment', () => {
  it('builds a default comment that parses through zBlogComment', () => {
    expect(problems(zBlogComment, makeBlogComment())).toEqual([])
  })

  it('derives the content and uuid from the id, and takes reply overrides', () => {
    const reply = makeBlogComment({ id: 4, isReply: true, parent: 1 })

    expect(problems(zBlogComment, reply)).toEqual([])
    expect(reply).toMatchObject({ id: 4, parent: 1, translations: { el: { content: 'Σχόλιο 4' } } })
    expect(reply.uuid).not.toBe(makeBlogComment().uuid)
  })
})

describe('makeBlogCategory', () => {
  it('builds a default category that parses through zBlogCategory', () => {
    expect(problems(zBlogCategory, makeBlogCategory())).toEqual([])
  })

  it('derives the name and slug from the id', () => {
    expect(makeBlogCategory({ id: 3 })).toMatchObject({ slug: 'category-3', translations: { el: { name: 'Κατηγορία 3' } } })
  })
})
