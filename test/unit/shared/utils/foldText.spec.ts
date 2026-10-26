import { describe, expect, it } from 'vitest'
import { foldText } from '~~/shared/utils/foldText'

describe('foldText', () => {
  it('ignores case', () => {
    expect(foldText('Kabelo')).toBe(foldText('KABELO'))
  })

  it('ignores accents, so capitals typed without a tonos still match', () => {
    expect(foldText('Αγρός')).toBe(foldText('ΑΓΡΟΣ'))
    expect(foldText('Café')).toBe('cafe')
  })

  it('keeps different letters apart', () => {
    expect(foldText('Χρώμα')).not.toBe(foldText('Χρήμα'))
  })
})
