import { describe, expect, it } from 'vitest'
import { zListBlogCommentRepliesQuery } from '~~/shared/openapi/zod.gen'

// Contract tripwire: Zod 4 object schemas strip unknown keys, so if a
// paginated custom action's OpenAPI schema ever loses its pagination
// params again (see AUDIT-REPORT H21 — the proxy silently dropped
// `cursor` and replies pagination was inert in production), the server
// route's getValidatedQuery() would swallow them without any error.
describe('listBlogCommentReplies query contract', () => {
  it('keeps the pagination params the replies UI sends', () => {
    const sent = {
      cursor: 'cD0yMDI2LTA4LTMw',
      paginationType: 'cursor',
      pageSize: 4,
      languageCode: 'el',
    }

    const parsed = zListBlogCommentRepliesQuery.parse(sent)

    expect(parsed).toMatchObject(sent)
  })
})
