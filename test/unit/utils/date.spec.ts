import { describe, it, expect, beforeEach, vi } from 'vitest'
import { formatTime } from '~/utils/date'

describe('Date Utils', () => {
  describe('formatTime', () => {
    it('should format minutes to hours and minutes', () => {
      expect(formatTime(90)).toBe('1h 30min')
    })

    it('should format less than 60 minutes', () => {
      expect(formatTime(45)).toBe(' 45min')
    })

    it('should format exactly 60 minutes', () => {
      expect(formatTime(60)).toBe('1h 0min')
    })

    it('should format multiple hours', () => {
      expect(formatTime(150)).toBe('2h 30min')
    })

    it('should handle zero minutes', () => {
      expect(formatTime(0)).toBe(' 0min')
    })

    it('should handle 1 minute', () => {
      expect(formatTime(1)).toBe(' 1min')
    })

    it('should handle large values', () => {
      expect(formatTime(600)).toBe('10h 0min')
    })

    it('should handle fractional minutes by flooring', () => {
      expect(formatTime(90.5)).toBe('1h 30min')
    })
  })
})
