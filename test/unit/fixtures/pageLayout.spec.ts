import { describe, expect, it } from 'vitest'

import { zPageLayout, zPageSection } from '~~/shared/openapi/zod.gen'
import { makePageLayout, makePageSection } from '~~/test/fixtures/pageLayout'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makePageLayout` and `makePageSection` replace the layout literals the
 * page specs spelled out. Parsed strictly, so a stale key fails here and
 * names itself.
 */
describe('makePageSection', () => {
  it('builds a default section that parses through zPageSection', () => {
    expect(problems(zPageSection, makePageSection())).toEqual([])
  })

  it('keeps a second section valid and distinct from the first', () => {
    const second = makePageSection({ id: 2, componentType: 'hero_carousel', sortOrder: 1 })

    expect(problems(zPageSection, second)).toEqual([])
    expect(second.uuid).not.toBe(makePageSection().uuid)
  })
})

describe('makePageLayout', () => {
  it('builds a default layout that parses through zPageLayout', () => {
    expect(problems(zPageLayout, makePageLayout())).toEqual([])
  })

  it('carries SEO fields and sections and stays valid', () => {
    const layout = makePageLayout({
      pageType: 'blog-post',
      seoTitle: 'Layout title',
      seoDescription: 'Layout description',
      sections: [makePageSection()],
    })

    expect(problems(zPageLayout, layout)).toEqual([])
  })
})
