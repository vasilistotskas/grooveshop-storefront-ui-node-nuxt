import { describe, it, expect } from 'vitest'

describe('debug localStorage', () => {
  it('should check localStorage', () => {
    console.log('typeof localStorage:', typeof localStorage)
    console.log('typeof localStorage.getItem:', typeof localStorage?.getItem)
    console.log('localStorage:', localStorage)
  })
})
