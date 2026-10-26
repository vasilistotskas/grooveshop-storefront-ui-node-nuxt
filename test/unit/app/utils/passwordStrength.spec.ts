import { describe, it, expect } from 'vitest'
import { passwordStrength } from '~/utils/passwordStrength'

describe('passwordStrength', () => {
  it.each([
    { password: '', score: 0, color: 'neutral' },
    { password: '!', score: 0, color: 'neutral' },
    { password: 'abc', score: 1, color: 'error' },
    { password: 'abcdefgh', score: 2, color: 'error' },
    { password: '12345678', score: 2, color: 'error' },
    { password: 'abcdefg1', score: 3, color: 'warning' },
    // Seven characters miss only the length rule.
    { password: 'Abcdef1', score: 3, color: 'warning' },
    { password: 'Abcdefg1', score: 4, color: 'success' },
    // Greek letters are letters: [a-z] never matched them.
    { password: 'Καλημέρα2024', score: 4, color: 'success' },
    { password: 'καλημέρα2024', score: 3, color: 'warning' },
  ])('scores "$password" $score of 4 ($color)', ({ password, score, color }) => {
    const strength = passwordStrength(password)

    expect(strength.score).toBe(score)
    expect(strength.color).toBe(color)
  })

  it('names which rules are met, in the order the forms list them', () => {
    expect(passwordStrength('abcdefg1').requirements).toEqual([
      { id: 'length', met: true },
      { id: 'number', met: true },
      { id: 'lowercase', met: true },
      { id: 'uppercase', met: false },
    ])
  })

  it('reads a missing password as an empty one', () => {
    expect(passwordStrength(undefined).score).toBe(0)
    expect(passwordStrength(null).score).toBe(0)
  })
})
