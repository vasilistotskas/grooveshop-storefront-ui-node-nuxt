import { describe, it, expect } from 'vitest'
import { useOrdering } from '~/composables/useOrdering'

describe('useOrdering', () => {
  it('should create ordering options for single field', () => {
    const ordering: EntityOrdering<'name'> = [
      {
        value: 'name',
        label: 'Name',
        options: ['ascending', 'descending'],
      },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value.name).toEqual([
      { value: 'name', label: 'Name ▲' },
      { value: '-name', label: 'Name ▼' },
    ])
  })

  it('should create ordering options for multiple fields', () => {
    const ordering: EntityOrdering<'name' | 'price'> = [
      {
        value: 'name',
        label: 'Name',
        options: ['ascending', 'descending'],
      },
      {
        value: 'price',
        label: 'Price',
        options: ['ascending', 'descending'],
      },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value.name).toEqual([
      { value: 'name', label: 'Name ▲' },
      { value: '-name', label: 'Name ▼' },
    ])
    expect(orderingOptions.value.price).toEqual([
      { value: 'price', label: 'Price ▲' },
      { value: '-price', label: 'Price ▼' },
    ])
  })

  it('should create flat array of all ordering options', () => {
    const ordering: EntityOrdering<'name' | 'price'> = [
      {
        value: 'name',
        label: 'Name',
        options: ['ascending', 'descending'],
      },
      {
        value: 'price',
        label: 'Price',
        options: ['ascending', 'descending'],
      },
    ]

    const { orderingOptionsArray } = useOrdering(ordering)

    expect(orderingOptionsArray.value).toHaveLength(4)
    expect(orderingOptionsArray.value).toContainEqual({ value: 'name', label: 'Name ▲' })
    expect(orderingOptionsArray.value).toContainEqual({ value: '-name', label: 'Name ▼' })
    expect(orderingOptionsArray.value).toContainEqual({ value: 'price', label: 'Price ▲' })
    expect(orderingOptionsArray.value).toContainEqual({ value: '-price', label: 'Price ▼' })
  })

  it('should handle ascending only option', () => {
    const ordering: EntityOrdering<'created'> = [
      {
        value: 'created',
        label: 'Created Date',
        options: ['ascending'],
      },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value.created).toEqual([
      { value: 'created', label: 'Created Date ▲' },
    ])
  })

  it('should handle descending only option', () => {
    const ordering: EntityOrdering<'updated'> = [
      {
        value: 'updated',
        label: 'Updated Date',
        options: ['descending'],
      },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value.updated).toEqual([
      { value: '-updated', label: 'Updated Date ▼' },
    ])
  })

  it('should handle empty ordering array', () => {
    const ordering: EntityOrdering<never> = []

    const { orderingOptions, orderingOptionsArray } = useOrdering(ordering)

    expect(Object.keys(orderingOptions.value)).toHaveLength(0)
    expect(orderingOptionsArray.value).toHaveLength(0)
  })

  it('should use correct symbols for ascending and descending', () => {
    const ordering: EntityOrdering<'score'> = [
      {
        value: 'score',
        label: 'Score',
        options: ['ascending', 'descending'],
      },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value.score?.[0].label).toContain('▲')
    expect(orderingOptions.value.score?.[1].label).toContain('▼')
  })

  it('should prefix descending values with minus sign', () => {
    const ordering: EntityOrdering<'rating'> = [
      {
        value: 'rating',
        label: 'Rating',
        options: ['ascending', 'descending'],
      },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value.rating?.[0].value).toBe('rating')
    expect(orderingOptions.value.rating?.[1].value).toBe('-rating')
  })

  it('should handle complex field names', () => {
    const ordering: EntityOrdering<'created_at' | 'updated_at'> = [
      {
        value: 'created_at',
        label: 'Created At',
        options: ['ascending', 'descending'],
      },
      {
        value: 'updated_at',
        label: 'Updated At',
        options: ['ascending', 'descending'],
      },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value.created_at).toBeDefined()
    expect(orderingOptions.value.updated_at).toBeDefined()
    expect(orderingOptions.value.created_at?.[1].value).toBe('-created_at')
  })
})
