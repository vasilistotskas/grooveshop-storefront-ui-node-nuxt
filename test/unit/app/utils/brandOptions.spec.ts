import { describe, it, expect } from 'vitest'
import { buildBrandOptions } from '~/utils/brandOptions'
import { makeBrand } from '~~/test/fixtures/productFilters'

const KABELO = makeBrand({ id: 3, name: 'Kabelo' })
const VOLTRA = makeBrand({ id: 7, name: 'Voltra' })
const GROOVE = makeBrand({ id: 9, name: 'Groove' })

const rows = (options: ReturnType<typeof buildBrandOptions>) =>
  options.map(option => [option.id, option.label, option.count, option.selected])

describe('buildBrandOptions', () => {
  it('lists the brands in the list order with their counts and the ticked ones', () => {
    expect(rows(buildBrandOptions([KABELO, VOLTRA], { 3: 10, 7: 14 }, ['7']))).toEqual([
      ['3', 'Kabelo', 10, false],
      ['7', 'Voltra', 14, true],
    ])
  })

  it('leaves out a brand no product in the listing carries', () => {
    expect(rows(buildBrandOptions([KABELO, VOLTRA, GROOVE], { 3: 10 }, []))).toEqual([['3', 'Kabelo', 10, false]])
  })

  it('keeps a selected brand with no products, so it can be cleared', () => {
    expect(rows(buildBrandOptions([KABELO, GROOVE], { 3: 10 }, ['9']))).toEqual([
      ['3', 'Kabelo', 10, false],
      ['9', 'Groove', 0, true],
    ])
  })
})
