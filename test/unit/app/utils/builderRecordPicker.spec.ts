import { describe, expect, it } from 'vitest'
import { builderLinkRefOf, builderRecordGroups, builderRecordKey, builderRecordLabel, builderRecordLabelsQuery } from '~/utils/builderRecordPicker'
import type { LinkSearchResult } from '~~/shared/openapi/types.gen'

const result = (kind: LinkSearchResult['kind'], id: number | string, label: string): LinkSearchResult => ({ kind, id, label, slug: String(id), active: true })

describe('builderLinkRefOf', () => {
  it('takes a numeric id for a record and a key for a page', () => {
    expect(builderLinkRefOf('product', 12)).toEqual({ kind: 'product', id: 12 })
    expect(builderLinkRefOf('page', 'summer-sale')).toEqual({ kind: 'page', id: 'summer-sale' })
    expect(builderLinkRefOf('contentPage', 'returns')).toEqual({ kind: 'contentPage', id: 'returns' })
  })

  it('refuses an id of the wrong type, which no link may hold', () => {
    expect(builderLinkRefOf('product', '12')).toBeUndefined()
    expect(builderLinkRefOf('category', 0)).toBeUndefined()
    expect(builderLinkRefOf('blogPost', 1.5)).toBeUndefined()
    expect(builderLinkRefOf('page', 3)).toBeUndefined()
    expect(builderLinkRefOf('page', '')).toBeUndefined()
  })
})

describe('builderRecordGroups', () => {
  it('groups the results by kind, in the order the answer gives them', () => {
    const groups = builderRecordGroups([result('category', 7, 'Καλώδια'), result('product', 12, 'Καλώδιο'), result('category', 8, 'Θήκες')])

    expect(groups.map(({ kind, results }) => [kind, results.map(({ id }) => id)])).toEqual([['category', [7, 8]], ['product', [12]]])
  })
})

describe('a record\'s label', () => {
  it('is asked for by its kind and id, and read back from the answer', () => {
    const ref = { kind: 'product', id: 42 } as const

    expect(builderRecordKey(ref)).toBe('product:42')
    expect(builderRecordLabelsQuery(ref)).toEqual({ product: '42' })
    expect(builderRecordLabel({ product: { 42: { label: 'Φορτιστής', active: false } } }, ref)).toEqual({ label: 'Φορτιστής', active: false })
    expect(builderRecordLabel({ category: { 42: { label: 'Άλλο', active: true } } }, ref)).toBeUndefined()
    expect(builderRecordLabel(undefined, ref)).toBeUndefined()
  })
})
