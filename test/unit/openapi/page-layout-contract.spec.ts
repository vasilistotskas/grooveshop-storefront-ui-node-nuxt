import { describe, expect, it } from 'vitest'
import { zPageLayout } from '~~/shared/openapi/zod.gen'

/**
 * Contract tripwire for the per-locale page layout.
 *
 * Django resolves a layout's SEO strings for the requested locale and
 * always sends all three — an empty string means "no tag", never an
 * absent field. The layout-driven pages (`Storefront/BrandPage.vue`)
 * read them straight into the head, so a schema that made them optional
 * would let a missing field through the proxy instead of failing there.
 */
const LAYOUT = {
  id: 1,
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  pageType: 'home',
  title: 'Homepage',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  isPublished: true,
  metadata: {},
  sections: [],
}

describe('page layout contract', () => {
  it('accepts a layout whose SEO strings are empty', () => {
    expect(zPageLayout.safeParse(LAYOUT).success).toBe(true)
  })

  it.each(['seoTitle', 'seoDescription', 'seoKeywords'])('requires %s', (field) => {
    const { [field as keyof typeof LAYOUT]: _dropped, ...layout } = LAYOUT
    const result = zPageLayout.safeParse(layout)

    expect(result.success).toBe(false)
    expect(result.error?.issues.map(issue => issue.path.join('.'))).toEqual([field])
  })
})
