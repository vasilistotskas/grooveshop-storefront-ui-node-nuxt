import { describe, it, expect } from 'vitest'
import { useOrdering } from '~/composables/useOrdering'
import type { EntityOrdering } from '~~/shared/types/ordering'

describe('useOrdering', () => {
  it('builds an ascending and a descending option per field, grouped by field', () => {
    const ordering: EntityOrdering<'name' | 'price'> = [
      { value: 'name', label: 'Name', options: ['ascending', 'descending'] },
      { value: 'price', label: 'Price', options: ['ascending', 'descending'] },
    ]

    const { orderingOptions } = useOrdering(ordering)

    expect(orderingOptions.value).toEqual({
      name: [{ value: 'name', label: 'Name ▲' }, { value: '-name', label: 'Name ▼' }],
      price: [{ value: 'price', label: 'Price ▲' }, { value: '-price', label: 'Price ▼' }],
    })
  })

  it.each([
    ['ascending', { value: 'created', label: 'Created ▲' }],
    ['descending', { value: '-created', label: 'Created ▼' }],
  ] as const)('offers only the %s option when that is all the field allows', (option, expected) => {
    const { orderingOptions } = useOrdering<'created'>([{ value: 'created', label: 'Created', options: [option] }])

    expect(orderingOptions.value.created).toEqual([expected])
  })

  it('flattens the options in field order', () => {
    const { orderingOptionsArray } = useOrdering<'name' | 'price'>([
      { value: 'name', label: 'Name', options: ['ascending', 'descending'] },
      { value: 'price', label: 'Price', options: ['descending'] },
    ])

    expect(orderingOptionsArray.value).toEqual([
      { value: 'name', label: 'Name ▲' },
      { value: '-name', label: 'Name ▼' },
      { value: '-price', label: 'Price ▼' },
    ])
  })

  it('has no options for an empty ordering', () => {
    const { orderingOptions, orderingOptionsArray } = useOrdering<never>([])

    expect(orderingOptions.value).toEqual({})
    expect(orderingOptionsArray.value).toEqual([])
  })
})
