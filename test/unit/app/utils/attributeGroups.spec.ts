import { describe, it, expect } from 'vitest'
import { buildAttributeGroups } from '~/utils/attributeGroups'
import { makeAttribute, makeAttributeValue } from '~~/test/fixtures/productFilters'

const POWER = makeAttribute({ id: 1, name: { el: 'Ισχύς', en: 'Power output' } })
const COLOUR = makeAttribute({ id: 2, name: { el: 'Χρώμα', en: 'Colour' } })
const W65 = makeAttributeValue({ id: 12, attribute: 1, sortOrder: 3, value: { el: '65W', en: '65W' } })
const W20 = makeAttributeValue({ id: 10, attribute: 1, sortOrder: 1, value: { el: '20W', en: '20W' } })
const W30 = makeAttributeValue({ id: 11, attribute: 1, sortOrder: 2, value: { el: '30W', en: '30W' } })
const BLACK = makeAttributeValue({ id: 20, attribute: 2, sortOrder: 1, value: { el: 'Μαύρο', en: 'Black' } })

const labels = (groups: ReturnType<typeof buildAttributeGroups>) =>
  groups.map(group => [group.label, group.options.map(option => [option.label, option.count, option.selected])])

describe('buildAttributeGroups', () => {
  it('groups values under their attribute, in the merchant\'s order whatever the counts', () => {
    const groups = buildAttributeGroups([POWER, COLOUR], [W65, BLACK, W20, W30], { 10: 1, 11: 9, 12: 4, 20: 2 }, ['12'], 'en')

    expect(labels(groups)).toEqual([
      ['Power output', [['20W', 1, false], ['30W', 9, false], ['65W', 4, true]]],
      ['Colour', [['Black', 2, false]]],
    ])
  })

  it('names attributes and values in the requested locale', () => {
    const [group] = buildAttributeGroups([COLOUR], [BLACK], { 20: 2 }, [], 'el')

    expect([group!.label, group!.options[0]!.label]).toEqual(['Χρώμα', 'Μαύρο'])
  })

  it('leaves out a value no listed product carries, unless it is selected', () => {
    const groups = buildAttributeGroups([POWER], [W20, W30, W65], { 10: 3 }, ['11'], 'en')

    expect(groups[0]!.options.map(option => option.id)).toEqual(['10', '11'])
  })

  it('leaves out an attribute with nothing left to choose, and inactive attributes and values', () => {
    const groups = buildAttributeGroups(
      [POWER, { ...COLOUR, active: false }],
      [W20, { ...W30, active: false }, BLACK],
      { 10: 1, 11: 5, 20: 4 },
      [],
      'en',
    )

    expect(labels(groups)).toEqual([['Power output', [['20W', 1, false]]]])
    expect(buildAttributeGroups([POWER], [W20], {}, [], 'en')).toEqual([])
  })
})
