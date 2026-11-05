import { describe, expect, it } from 'vitest'
import { BLOG_POST_ORDER_BY, blogPostListQuery } from '~~/shared/builder/blogPostQuery'
import { BLOG_POST_ORDERINGS } from '~~/shared/constants/builder'

/**
 * The question a rule that lists blog posts puts to Django's list endpoint.
 * The server reads the band's first page with it and a band that goes on
 * reads the following ones with the same, so this is the one place the
 * mapping lives.
 */
describe('blogPostListQuery', () => {
  it('sorts every ordering a band offers by the field Django orders it by', () => {
    expect(Object.keys(BLOG_POST_ORDER_BY)).toEqual([...BLOG_POST_ORDERINGS])
    expect(blogPostListQuery({ mode: 'filter', ordering: 'newest', limit: 3 })).toEqual({ pageSize: 3, ordering: '-publishedAt' })
    expect(blogPostListQuery({ mode: 'filter', ordering: 'mostViewed', limit: 9 })).toEqual({ pageSize: 9, ordering: '-viewCount' })
  })

  it('names the category and featured only when the rule does, `featured: false` included', () => {
    expect(blogPostListQuery({ mode: 'filter', category: 4, featured: false, ordering: 'newest', limit: 3 })).toEqual({
      pageSize: 3,
      ordering: '-publishedAt',
      category: 4,
      featured: false,
    })
    expect(blogPostListQuery({ mode: 'filter', ordering: 'newest', limit: 3 })).not.toHaveProperty('category')
    expect(blogPostListQuery({ mode: 'filter', ordering: 'newest', limit: 3 })).not.toHaveProperty('featured')
  })
})
