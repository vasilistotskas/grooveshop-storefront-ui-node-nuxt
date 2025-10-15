import { describe, it, expect } from 'vitest'
import { removeDuplicates } from '~/utils/array'

describe('Array Utils', () => {
  describe('removeDuplicates', () => {
    it('should remove duplicate numbers', () => {
      const input = [1, 2, 2, 3, 3, 3, 4]
      const result = removeDuplicates(input)
      expect(result).toEqual([1, 2, 3, 4])
    })

    it('should remove duplicate strings', () => {
      const input = ['a', 'b', 'b', 'c', 'c', 'c']
      const result = removeDuplicates(input)
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty array', () => {
      const result = removeDuplicates([])
      expect(result).toEqual([])
    })

    it('should handle array with no duplicates', () => {
      const input = [1, 2, 3, 4, 5]
      const result = removeDuplicates(input)
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle array with all duplicates', () => {
      const input = [1, 1, 1, 1]
      const result = removeDuplicates(input)
      expect(result).toEqual([1])
    })

    it('should handle mixed types', () => {
      const input = [1, '1', 2, '2', 1, '1']
      const result = removeDuplicates(input)
      expect(result).toEqual([1, '1', 2, '2'])
    })

    it('should preserve order of first occurrence', () => {
      const input = [3, 1, 2, 1, 3, 2]
      const result = removeDuplicates(input)
      expect(result).toEqual([3, 1, 2])
    })

    it('should handle objects by reference', () => {
      const obj1 = { id: 1 }
      const obj2 = { id: 2 }
      const input = [obj1, obj2, obj1, obj2]
      const result = removeDuplicates(input)
      expect(result).toEqual([obj1, obj2])
    })
  })
})
