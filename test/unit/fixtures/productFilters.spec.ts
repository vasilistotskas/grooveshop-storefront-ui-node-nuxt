import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import {
  zAttribute,
  zAttributeValue,
  zBlogPostMeiliSearchResponse,
  zBlogPostMeiliSearchResult,
  zProductCategory,
  zProductMeiliSearchResponse,
  zProductMeiliSearchResult,
} from '~~/shared/openapi/zod.gen'
import {
  createProductFiltersMock,
  makeAttribute,
  makeAttributeValue,
  makeBlogPostSearchHit,
  makeBlogPostSearchResponse,
  makeCategory,
  makeProductSearchHit,
  makeProductSearchResponse,
} from '~~/test/fixtures/productFilters'

/**
 * The listing and filter fixtures replace hand-built categories that
 * carried a top-level `name` and no `translations` — so every category
 * filter spec rendered the empty state and passed anyway. Parsed
 * strictly (an unknown key is a renamed field) so a schema change fails
 * here, naming the field.
 */
function problems(schema: z.ZodObject, value: unknown): string[] {
  const result = schema.strict().safeParse(value)
  return result.success
    ? []
    : result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
}

describe('the catalogue fixtures', () => {
  it.each([
    ['makeCategory', zProductCategory, () => makeCategory()],
    ['makeAttribute', zAttribute, () => makeAttribute()],
    ['makeAttributeValue', zAttributeValue, () => makeAttributeValue()],
    ['makeProductSearchHit', zProductMeiliSearchResult, () => makeProductSearchHit()],
    ['makeBlogPostSearchHit', zBlogPostMeiliSearchResult, () => makeBlogPostSearchHit()],
  ] as const)('%s parses through its generated schema', (_name, schema, build) => {
    expect(problems(schema, build())).toEqual([])
  })

  it('names a category in both locales through parler translations', () => {
    const category = makeCategory({ id: 3, name: { el: 'Βιβλία', en: 'Books' } })

    expect(problems(zProductCategory, category)).toEqual([])
    expect(category.translations.el?.name).toBe('Βιβλία')
    expect(category.translations.en?.name).toBe('Books')
    expect(category.uuid).not.toBe(makeCategory({ id: 4 }).uuid)
  })

  it('builds search responses whose total follows their hits', () => {
    const products = makeProductSearchResponse({ results: [makeProductSearchHit({ id: 1 }), makeProductSearchHit({ id: 2 })] })
    const posts = makeBlogPostSearchResponse({ results: [makeBlogPostSearchHit()] })

    expect(problems(zProductMeiliSearchResponse, products)).toEqual([])
    expect(problems(zBlogPostMeiliSearchResponse, posts)).toEqual([])
    expect(products.estimatedTotalHits).toBe(2)
    expect(posts.estimatedTotalHits).toBe(1)
    expect(products.queryId).not.toBe(posts.queryId)
  })
})

describe('createProductFiltersMock', () => {
  it('reports active filters from its count and resets to none', () => {
    const pf = createProductFiltersMock()
    pf.filters.value.categories = ['1', '2']
    pf.activeFilterCount.value = 1

    expect(pf.hasActiveFilters.value).toBe(true)
    expect(pf.filterCountBySection.value.categories).toBe(2)

    pf.reset()

    expect(pf.hasActiveFilters.value).toBe(false)
    expect(pf.filters.value.categories).toEqual([])
  })
})
