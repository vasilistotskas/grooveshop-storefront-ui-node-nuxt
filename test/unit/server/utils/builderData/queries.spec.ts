import { describe, expect, it } from 'vitest'
import { DATA_MEDIA_MAX_IDS } from '~~/shared/constants/builder'
import { blogCategoryQuery, blogPostQuery, categoryQuery, idQueries, mediaQueries, productQuery, promotionLimit } from '~~/server/utils/builderData/queries'

describe('idQueries', () => {
  it('asks for the ids as one sorted set, however they were given', () => {
    expect(idQueries([5, 3, 5, 1])).toEqual([{ id_In: '1,3,5', pageSize: 3 }])
  })

  it('splits a set past the page size Django answers into as many reads', () => {
    const ids = Array.from({ length: 205 }, (_, index) => index + 1)

    const queries = idQueries(ids)

    expect(queries.map(query => query.pageSize)).toEqual([100, 100, 5])
    expect(queries.flatMap(query => String(query.id_In).split(',')).map(Number)).toEqual(ids)
  })

  it('asks nothing for no ids', () => {
    expect(idQueries([])).toEqual([])
  })
})

describe('mediaQueries', () => {
  it('asks for the ids as one sorted set, in the `ids` of the resolve read', () => {
    expect(mediaQueries([5, 3, 5, 1])).toEqual([{ ids: '1,3,5' }])
  })

  it('splits a set past the most ids Django answers into as many reads', () => {
    const ids = Array.from({ length: DATA_MEDIA_MAX_IDS * 2 + 5 }, (_, index) => index + 1)

    const queries = mediaQueries(ids)

    expect(queries.map(query => String(query.ids).split(',').length)).toEqual([DATA_MEDIA_MAX_IDS, DATA_MEDIA_MAX_IDS, 5])
    expect(queries.flatMap(query => String(query.ids).split(',')).map(Number)).toEqual(ids)
  })

  it('asks nothing for no ids', () => {
    expect(mediaQueries([])).toEqual([])
  })
})

describe('productQuery', () => {
  it.each([
    ['newest', '-createdAt'],
    ['mostViewed', '-viewCount'],
    ['mostLiked', '-likesCount'],
    ['topRated', '-reviewAverage'],
    ['priceAsc', 'effectivePrice'],
    ['priceDesc', '-effectivePrice'],
  ])('orders %s by %s', (ordering, orderBy) => {
    expect(productQuery({ mode: 'filter', ordering, limit: 6 })).toEqual({ pageSize: 6, ordering: orderBy })
  })

  it('lists only the products that announce a reduction for `discounted`', () => {
    expect(productQuery({ mode: 'filter', ordering: 'discounted', limit: 4 })).toEqual({
      pageSize: 4,
      ordering: '-announcedDiscountPercent',
      minAnnouncedDiscountPercent: 1,
    })
  })

  it('joins the categories with an underscore, as one sorted set, which the endpoint widens to their descendants', () => {
    expect(productQuery({ mode: 'filter', categories: [9, 2, 9], ordering: 'newest', limit: 4 })).toMatchObject({ category: '2_9' })
  })

  it('refuses a hand-picked list: those are read by id', () => {
    expect(() => productQuery({ mode: 'picked', ids: [1] })).toThrow(/by id/)
  })

  it('refuses a descriptor the vocabulary does not have', () => {
    expect(() => productQuery({ mode: 'filter', ordering: 'featured', limit: 4 })).toThrow()
    expect(() => productQuery({ mode: 'filter', ordering: 'newest', limit: 4, price: 1 })).toThrow()
  })
})

describe('blogPostQuery', () => {
  it('orders the latest by publication and the most viewed by views', () => {
    expect(blogPostQuery({ mode: 'filter', ordering: 'newest', limit: 3 })).toEqual({ pageSize: 3, ordering: '-publishedAt' })
    expect(blogPostQuery({ mode: 'filter', ordering: 'mostViewed', limit: 3 })).toEqual({ pageSize: 3, ordering: '-viewCount' })
  })

  it('filters by category and by featured, and asks for `featured: false` too', () => {
    expect(blogPostQuery({ mode: 'filter', category: 4, featured: false, ordering: 'newest', limit: 3 })).toEqual({
      pageSize: 3,
      ordering: '-publishedAt',
      category: 4,
      featured: false,
    })
  })
})

describe('categoryQuery', () => {
  it('lists the roots, or the children of a parent', () => {
    expect(categoryQuery({ mode: 'roots', limit: 8 })).toEqual({ isRoot: true, pageSize: 8 })
    expect(categoryQuery({ mode: 'children', parent: 12, limit: 24 })).toEqual({ parent: 12, pageSize: 24 })
  })
})

describe('blogCategoryQuery and promotionLimit', () => {
  it('keep the limit', () => {
    expect(blogCategoryQuery({ limit: 10 })).toEqual({ pageSize: 10 })
    expect(promotionLimit({ limit: 3 })).toBe(3)
  })

  it('refuse a limit over the cap', () => {
    expect(() => blogCategoryQuery({ limit: 25 })).toThrow()
    expect(() => promotionLimit({ limit: 0 })).toThrow()
  })
})
