import { describe, expect, it } from 'vitest'
import { labelMatches, narrowOptions } from '~/utils/filterSearch'
import { foldText } from '~~/shared/utils/foldText'

const options = [
  { id: '1', label: 'Κόκκινο', selected: false },
  { id: '2', label: 'Μπλε', selected: true },
  { id: '3', label: 'Κίτρινο', selected: false },
]

describe('labelMatches', () => {
  it('matches a part of the label without case or accents', () => {
    expect(labelMatches('Ισχύς ήχου', foldText('ΙΣΧΥΣ'))).toBe(true)
    expect(labelMatches('Χρώμα', foldText('ισχ'))).toBe(false)
  })
})

describe('narrowOptions', () => {
  it('keeps the matching options and any selected one', () => {
    expect(narrowOptions(options, foldText('κοκ'))!.map(option => option.id)).toEqual(['1', '2'])
  })

  it('is null when no option matches, a selected one notwithstanding', () => {
    expect(narrowOptions(options, foldText('πρασ'))).toBeNull()
  })
})
