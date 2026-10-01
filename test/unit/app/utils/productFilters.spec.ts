import { describe, it, expect } from 'vitest'
import {
  applyFilterUpdates,
  buildFilterChips,
  countActiveFilters,
  countFiltersBySection,
  parseProductFilters,
} from '~/utils/productFilters'
import type { FilterChip, ProductFilters } from '~~/shared/types/product-filters'

/** No filter set — what an empty listing URL parses to. */
const NONE: ProductFilters = {
  search: '',
  priceMin: undefined,
  priceMax: undefined,
  likesMin: undefined,
  viewsMin: undefined,
  categories: [],
  sort: '',
  attributeValues: [],
}

const filters = (overrides: Partial<ProductFilters> = {}): ProductFilters => ({ ...NONE, ...overrides })

/** Labels are the i18n keys themselves, so a chip's label names the key it used. */
const t = (key: string) => `t:${key}`

describe('parseProductFilters', () => {
  it('parses an empty query to no filters', () => {
    expect(parseProductFilters({})).toEqual(NONE)
  })

  it.each([
    ['q', 'laptop', { search: 'laptop' }],
    ['priceMin', '100', { priceMin: 100 }],
    ['priceMax', '500', { priceMax: 500 }],
    ['likesMin', '50', { likesMin: 50 }],
    ['viewsMin', '100', { viewsMin: 100 }],
    ['priceMin', '0', { priceMin: 0 }],
    ['priceMax', '19.99', { priceMax: 19.99 }],
    ['sort', '-finalPrice', { sort: '-finalPrice' }],
    ['category', '1', { categories: ['1'] }],
    ['category', ['1', '2', '3'], { categories: ['1', '2', '3'] }],
    ['attributeValue', '10', { attributeValues: ['10'] }],
    ['attributeValue', ['10', '20'], { attributeValues: ['10', '20'] }],
  ])('reads ?%s=%j', (param, value, expected) => {
    expect(parseProductFilters({ [param]: value })).toEqual(filters(expected))
  })

  it.each(['q', 'priceMin', 'priceMax', 'likesMin', 'viewsMin', 'sort', 'category', 'attributeValue'])(
    'treats an empty ?%s= as not set',
    (param) => {
      expect(parseProductFilters({ [param]: '' })).toEqual(NONE)
    },
  )

  // A hand-edited or mangled URL: every value the search API would
  // refuse (its query schema: decimals for prices, integers for likes and
  // views) is no filter, instead of a NaN chip and a 400 from the search.
  it.each([
    ['priceMin', 'abc'],
    ['priceMax', '12abc'],
    ['priceMin', 'Infinity'],
    ['priceMin', ['1', '2']],
    ['likesMin', '1.5'],
    ['viewsMin', 'x'],
    ['viewsMin', '1e3'],
  ])('ignores ?%s=%j, which the search would refuse', (param, value) => {
    expect(parseProductFilters({ [param]: value })).toEqual(NONE)
  })

  it('reads every filter at once', () => {
    expect(parseProductFilters({
      q: 'laptop',
      priceMin: '500',
      priceMax: '1500',
      likesMin: '10',
      viewsMin: '50',
      category: ['1', '2'],
      sort: '-likesCount',
      attributeValue: '7',
    })).toEqual({
      search: 'laptop',
      priceMin: 500,
      priceMax: 1500,
      likesMin: 10,
      viewsMin: 50,
      categories: ['1', '2'],
      sort: '-likesCount',
      attributeValues: ['7'],
    })
  })
})

describe('applyFilterUpdates', () => {
  it.each<[string, Partial<ProductFilters>, Record<string, unknown>]>([
    ['search', { search: 'laptop' }, { q: 'laptop' }],
    ['priceMin', { priceMin: 100 }, { priceMin: '100' }],
    ['priceMin of 0', { priceMin: 0 }, { priceMin: '0' }],
    ['priceMax', { priceMax: 500 }, { priceMax: '500' }],
    ['likesMin', { likesMin: 50 }, { likesMin: '50' }],
    ['viewsMin', { viewsMin: 100 }, { viewsMin: '100' }],
    ['one category, bare', { categories: ['1'] }, { category: '1' }],
    ['several categories, as a list', { categories: ['1', '2'] }, { category: ['1', '2'] }],
    ['sort', { sort: '-finalPrice' }, { sort: '-finalPrice' }],
    ['one attribute value, bare', { attributeValues: ['10'] }, { attributeValue: '10' }],
    ['several attribute values, as a list', { attributeValues: ['10', '20'] }, { attributeValue: ['10', '20'] }],
  ])('writes %s to the query', (_label, updates, expected) => {
    expect(applyFilterUpdates({}, updates)).toEqual(expected)
  })

  const FULL = {
    q: 'laptop',
    priceMin: '100',
    priceMax: '500',
    likesMin: '50',
    viewsMin: '100',
    category: ['1', '2'],
    sort: '-finalPrice',
    attributeValue: '10',
  }

  it.each<[string, Partial<ProductFilters>, string]>([
    ['an empty search', { search: '' }, 'q'],
    ['priceMin: undefined', { priceMin: undefined }, 'priceMin'],
    ['priceMin: null', { priceMin: null as unknown as undefined }, 'priceMin'],
    ['priceMax: undefined', { priceMax: undefined }, 'priceMax'],
    ['likesMin: undefined', { likesMin: undefined }, 'likesMin'],
    ['viewsMin: undefined', { viewsMin: undefined }, 'viewsMin'],
    ['no categories', { categories: [] }, 'category'],
    ['an empty sort', { sort: '' }, 'sort'],
    ['no attribute values', { attributeValues: [] }, 'attributeValue'],
  ])('removes only the parameter %s clears', (_label, updates, removed) => {
    const { [removed as keyof typeof FULL]: _gone, ...rest } = FULL
    expect(applyFilterUpdates(FULL, updates)).toEqual(rest)
  })

  it('leaves every parameter the updates do not mention, including unrelated ones', () => {
    expect(applyFilterUpdates({ ...FULL, page: '3' }, {})).toEqual({ ...FULL, page: '3' })
  })

  it('applies several updates at once', () => {
    expect(applyFilterUpdates({ q: 'old', sort: 'name' }, {
      search: 'new',
      priceMin: 100,
      priceMax: 500,
      categories: ['1', '2'],
    })).toEqual({ q: 'new', sort: 'name', priceMin: '100', priceMax: '500', category: ['1', '2'] })
  })

  it('does not mutate the query it is given', () => {
    const query = { q: 'laptop' }
    applyFilterUpdates(query, { search: '' })
    expect(query).toEqual({ q: 'laptop' })
  })
})

describe('countActiveFilters', () => {
  it.each<[string, Partial<ProductFilters>, number]>([
    ['nothing', {}, 0],
    ['a search', { search: 'laptop' }, 1],
    ['priceMin', { priceMin: 100 }, 1],
    ['a priceMin of 0', { priceMin: 0 }, 1],
    ['priceMax', { priceMax: 500 }, 1],
    ['both price bounds, separately', { priceMin: 100, priceMax: 500 }, 2],
    ['likesMin', { likesMin: 50 }, 1],
    ['viewsMin', { viewsMin: 100 }, 1],
    ['several categories, once', { categories: ['1', '2'] }, 1],
    ['several attribute values, once', { attributeValues: ['10', '20'] }, 1],
    ['a sort', { sort: '-finalPrice' }, 1],
    ['every filter', {
      search: 'x',
      priceMin: 1,
      priceMax: 2,
      likesMin: 3,
      viewsMin: 4,
      categories: ['1'],
      sort: 'name',
      attributeValues: ['9'],
    }, 8],
  ])('counts %s', (_label, overrides, expected) => {
    expect(countActiveFilters(filters(overrides))).toBe(expected)
  })
})

describe('countFiltersBySection', () => {
  it('is zero for every section with no filters', () => {
    expect(countFiltersBySection(NONE)).toEqual({
      search: 0,
      price: 0,
      popularity: 0,
      viewCount: 0,
      categories: 0,
      attributes: 0,
    })
  })

  it.each<[string, Partial<ProductFilters>, Partial<ReturnType<typeof countFiltersBySection>>]>([
    ['priceMin alone', { priceMin: 100 }, { price: 1 }],
    ['priceMax alone', { priceMax: 500 }, { price: 1 }],
    ['both price bounds as one badge', { priceMin: 100, priceMax: 500 }, { price: 1 }],
    ['one per selected category', { categories: ['1', '2', '3'] }, { categories: 3 }],
    ['one per selected attribute value', { attributeValues: ['10', '20'] }, { attributes: 2 }],
  ])('counts %s', (_label, overrides, expected) => {
    expect(countFiltersBySection(filters(overrides))).toMatchObject(expected)
  })

  it('counts every section independently', () => {
    expect(countFiltersBySection(filters({
      search: 'laptop',
      priceMin: 100,
      likesMin: 50,
      viewsMin: 100,
      categories: ['1', '2'],
      attributeValues: ['10'],
      sort: 'name',
    }))).toEqual({ search: 1, price: 1, popularity: 1, viewCount: 1, categories: 2, attributes: 1 })
  })
})

describe('buildFilterChips', () => {
  it('builds no chips with no filters', () => {
    expect(buildFilterChips(NONE, t)).toEqual([])
  })

  it.each<[string, Partial<ProductFilters>, FilterChip[]]>([
    ['a search', { search: 'laptop' }, [
      { key: 'search', type: 'search', label: 't:filters.search', value: 'laptop' },
    ]],
    ['a full price range as one chip', { priceMin: 100, priceMax: 500 }, [
      { key: 'priceMin', type: 'price', label: 't:filters.price', value: { min: 100, max: 500 } },
    ]],
    ['priceMin alone', { priceMin: 100 }, [
      { key: 'priceMin', type: 'price', label: 't:filters.price', value: { min: 100, max: undefined } },
    ]],
    ['priceMax alone', { priceMax: 500 }, [
      { key: 'priceMin', type: 'price', label: 't:filters.price', value: { min: undefined, max: 500 } },
    ]],
    ['likesMin', { likesMin: 50 }, [
      { key: 'likesMin', type: 'likes', label: 't:filters.popularity', value: 50 },
    ]],
    ['a likesMin of 0', { likesMin: 0 }, [
      { key: 'likesMin', type: 'likes', label: 't:filters.popularity', value: 0 },
    ]],
    ['viewsMin', { viewsMin: 100 }, [
      { key: 'viewsMin', type: 'views', label: 't:filters.view_count', value: 100 },
    ]],
    ['a viewsMin of 0', { viewsMin: 0 }, [
      { key: 'viewsMin', type: 'views', label: 't:filters.view_count', value: 0 },
    ]],
    ['one chip per category', { categories: ['1', '2'] }, [
      { key: 'categories', type: 'category', label: 't:filters.categories', value: '1' },
      { key: 'categories', type: 'category', label: 't:filters.categories', value: '2' },
    ]],
    ['one chip per attribute value', { attributeValues: ['10', '20'] }, [
      { key: 'attributeValues', type: 'attribute', label: 't:filters.attributes', value: '10' },
      { key: 'attributeValues', type: 'attribute', label: 't:filters.attributes', value: '20' },
    ]],
    ['a sort', { sort: '-finalPrice' }, [
      { key: 'sort', type: 'sort', label: 't:filters.sort', value: '-finalPrice' },
    ]],
  ])('builds %s', (_label, overrides, expected) => {
    expect(buildFilterChips(filters(overrides), t)).toEqual(expected)
  })

  it('orders the chips search, price, likes, views, categories, attributes, sort', () => {
    const chips = buildFilterChips({
      search: 'laptop',
      priceMin: 1,
      priceMax: 2,
      likesMin: 3,
      viewsMin: 4,
      categories: ['c1', 'c2'],
      sort: 'name',
      attributeValues: ['a1'],
    }, t)
    expect(chips.map(chip => chip.type)).toEqual(
      ['search', 'price', 'likes', 'views', 'category', 'category', 'attribute', 'sort'],
    )
  })
})
