import { describe, expect, it } from 'vitest'

import { zContentPageDetail } from '~~/shared/openapi/zod.gen'
import { makeContentPage } from '~~/test/fixtures/contentPage'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makeContentPage` replaces the content-page literals the `/info` page
 * spec and the content-page route spec each spelled out. Parsed
 * strictly, so a stale key fails here and names itself.
 */
describe('makeContentPage', () => {
  it('builds a default page that parses through zContentPageDetail', () => {
    expect(problems(zContentPageDetail, makeContentPage())).toEqual([])
  })

  it('keeps a second, unpublished page valid and distinct from the first', () => {
    const draft = makeContentPage({ id: 2, slug: 'terms', isPublished: false, publishedAt: null })

    expect(problems(zContentPageDetail, draft)).toEqual([])
    expect(draft.uuid).not.toBe(makeContentPage().uuid)
  })
})
