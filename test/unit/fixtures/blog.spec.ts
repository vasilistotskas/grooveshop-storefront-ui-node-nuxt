import { describe, expect, it } from 'vitest'

import { zBlogAuthorDetail, zBlogCategory, zBlogComment, zBlogCommentDetail, zBlogPost, zBlogTag } from '~~/shared/openapi/zod.gen'
import { makeBlogAuthor, makeBlogCategory, makeBlogComment, makeBlogCommentDetail, makeBlogPost, makeBlogTag } from '~~/test/fixtures/blog'
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

describe('makeBlogCommentDetail', () => {
  it('builds a reply whose parent and ancestors carry the public author, and parses through zBlogCommentDetail', () => {
    const reply = makeBlogCommentDetail({ id: 5 })

    expect(problems(zBlogCommentDetail, reply)).toEqual([])
    expect(Object.keys(reply.parentComment!.user).sort()).toEqual(['firstName', 'id', 'lastName', 'mainImagePath', 'username'])
    expect(Object.keys(reply.ancestorsPath[0]!.user).sort()).toEqual(['firstName', 'id', 'lastName', 'mainImagePath', 'username'])
  })
})

describe('makeBlogPost', () => {
  it('builds a default post that parses through zBlogPost', () => {
    expect(problems(zBlogPost, makeBlogPost())).toEqual([])
  })

  it('derives the title, slug and uuid from the id', () => {
    const post = makeBlogPost({ id: 7 })

    expect(problems(zBlogPost, post)).toEqual([])
    expect(post).toMatchObject({ slug: 'post-7', translations: { el: { title: 'Άρθρο 7' } } })
    expect(post.uuid).not.toBe(makeBlogPost().uuid)
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

describe('makeBlogTag', () => {
  it('builds a default tag that parses through zBlogTag', () => {
    expect(problems(zBlogTag, makeBlogTag())).toEqual([])
  })

  it('derives the name and uuid from the id', () => {
    const tag = makeBlogTag({ id: 5 })

    expect(problems(zBlogTag, tag)).toEqual([])
    expect(tag.translations.el?.name).toBe('Ετικέτα 5')
    expect(tag.uuid).not.toBe(makeBlogTag().uuid)
  })
})

describe('makeBlogAuthor', () => {
  it('builds a default author that parses through zBlogAuthorDetail', () => {
    expect(problems(zBlogAuthorDetail, makeBlogAuthor())).toEqual([])
  })

  it('derives the uuid and the user from the id', () => {
    const author = makeBlogAuthor({ id: 4 })

    expect(problems(zBlogAuthorDetail, author)).toEqual([])
    expect(author.user).toMatchObject({ id: 4, lastName: 'Συντάκτης 4' })
    expect(author.uuid).not.toBe(makeBlogAuthor().uuid)
  })
})
