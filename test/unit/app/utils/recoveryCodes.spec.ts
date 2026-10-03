import { describe, it, expect } from 'vitest'
import { recoveryCodesRunningLow } from '~/utils/recoveryCodes'

describe('recoveryCodesRunningLow', () => {
  it.each([[0, true], [3, true], [4, false], [10, false]])('with %i unused codes: %s', (unused, low) => {
    expect(recoveryCodesRunningLow(unused)).toBe(low)
  })
})
