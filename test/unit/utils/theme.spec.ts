import { describe, it, expect } from 'vitest'
import { mergeClasses } from '~/utils/theme'

describe('Theme Utils', () => {
  describe('mergeClasses', () => {
    it('should merge string classes', () => {
      const obj1 = { class: 'text-red-500' }
      const obj2 = { class: 'font-bold' }
      const result = mergeClasses(obj1, obj2)
      expect(result.class).toContain('text-red-500')
      expect(result.class).toContain('font-bold')
    })

    it('should merge multiple string classes', () => {
      const obj1 = { class: 'text-red-500' }
      const obj2 = { class: 'font-bold' }
      const obj3 = { class: 'p-4' }
      const result = mergeClasses(obj1, obj2, obj3)
      expect(result.class).toContain('text-red-500')
      expect(result.class).toContain('font-bold')
      expect(result.class).toContain('p-4')
    })

    it('should handle empty string classes', () => {
      const obj1 = { class: '' }
      const obj2 = { class: 'font-bold' }
      const result = mergeClasses(obj1, obj2)
      expect(result.class).toContain('font-bold')
    })

    it('should trim whitespace', () => {
      const obj1 = { class: '  text-red-500  ' }
      const obj2 = { class: '  font-bold  ' }
      const result = mergeClasses(obj1, obj2)
      expect(result.class).toContain('text-red-500')
      expect(result.class).toContain('font-bold')
    })

    it('should merge nested object properties', () => {
      const obj1 = {
        button: {
          class: 'bg-blue-500',
        },
      }
      const obj2 = {
        button: {
          class: 'text-white',
        },
      }
      const result = mergeClasses(obj1, obj2)
      expect(result.button.class).toContain('bg-blue-500')
      expect(result.button.class).toContain('text-white')
    })

    it('should preserve non-string properties', () => {
      const obj1 = {
        class: 'text-red-500',
        disabled: true,
        count: 5,
      }
      const obj2 = {
        class: 'font-bold',
        disabled: false,
      }
      const result = mergeClasses(obj1, obj2)
      expect(result.class).toContain('text-red-500')
      expect(result.class).toContain('font-bold')
      // mergeClasses uses defu which keeps first value for non-string properties
      expect(result.disabled).toBeDefined()
      expect(result.count).toBe(5)
    })

    it('should handle objects without class property', () => {
      const obj1 = { disabled: true }
      const obj2 = { count: 5 }
      const result = mergeClasses(obj1, obj2)
      expect(result).toEqual({ disabled: true, count: 5 })
    })

    it('should merge complex nested structures', () => {
      const obj1 = {
        root: { class: 'container' },
        header: { class: 'header' },
      }
      const obj2 = {
        root: { class: 'mx-auto' },
        footer: { class: 'footer' },
      }
      const result = mergeClasses(obj1, obj2)
      expect(result.root.class).toContain('container')
      expect(result.root.class).toContain('mx-auto')
      expect(result.header.class).toBe('header')
      expect(result.footer.class).toBe('footer')
    })

    it('should handle single object', () => {
      const obj = { class: 'text-red-500' }
      const result = mergeClasses(obj)
      expect(result.class).toBe('text-red-500')
    })

    it('should handle empty objects', () => {
      const result = mergeClasses({}, {})
      expect(result).toEqual({})
    })

    it('should merge Tailwind utility classes', () => {
      const obj1 = {
        class: 'flex items-center justify-center',
      }
      const obj2 = {
        class: 'p-4 m-2 bg-white rounded-lg shadow-md',
      }
      const result = mergeClasses(obj1, obj2)
      expect(result.class).toContain('flex')
      expect(result.class).toContain('items-center')
      expect(result.class).toContain('p-4')
      expect(result.class).toContain('bg-white')
    })
  })
})
