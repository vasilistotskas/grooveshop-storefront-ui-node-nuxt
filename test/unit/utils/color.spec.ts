import { describe, it, expect } from 'vitest'
import { hexToRgb, rgbToHex } from '~/utils/color'

describe('Color Utils', () => {
  describe('hexToRgb', () => {
    it('should convert black hex to RGB', () => {
      const result = hexToRgb('#000000')
      expect(result).toEqual({ r: 0, g: 0, b: 0 })
    })

    it('should convert white hex to RGB', () => {
      const result = hexToRgb('#ffffff')
      expect(result).toEqual({ r: 255, g: 255, b: 255 })
    })

    it('should convert red hex to RGB', () => {
      const result = hexToRgb('#ff0000')
      expect(result).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('should convert green hex to RGB', () => {
      const result = hexToRgb('#00ff00')
      expect(result).toEqual({ r: 0, g: 255, b: 0 })
    })

    it('should convert blue hex to RGB', () => {
      const result = hexToRgb('#0000ff')
      expect(result).toEqual({ r: 0, g: 0, b: 255 })
    })

    it('should convert custom color hex to RGB', () => {
      const result = hexToRgb('#3b82f6')
      expect(result).toEqual({ r: 59, g: 130, b: 246 })
    })

    it('should handle uppercase hex', () => {
      const result = hexToRgb('#FF00FF')
      expect(result).toEqual({ r: 255, g: 0, b: 255 })
    })

    it('should handle mixed case hex', () => {
      const result = hexToRgb('#AbCdEf')
      expect(result).toEqual({ r: 171, g: 205, b: 239 })
    })
  })

  describe('rgbToHex', () => {
    it('should convert black RGB to hex', () => {
      const result = rgbToHex(0, 0, 0)
      expect(result).toBe('#000000')
    })

    it('should convert white RGB to hex', () => {
      const result = rgbToHex(255, 255, 255)
      expect(result).toBe('#ffffff')
    })

    it('should convert red RGB to hex', () => {
      const result = rgbToHex(255, 0, 0)
      expect(result).toBe('#ff0000')
    })

    it('should convert green RGB to hex', () => {
      const result = rgbToHex(0, 255, 0)
      expect(result).toBe('#00ff00')
    })

    it('should convert blue RGB to hex', () => {
      const result = rgbToHex(0, 0, 255)
      expect(result).toBe('#0000ff')
    })

    it('should convert custom color RGB to hex', () => {
      const result = rgbToHex(59, 130, 246)
      expect(result).toBe('#3b82f6')
    })

    it('should handle edge values', () => {
      const result = rgbToHex(1, 2, 3)
      expect(result).toBe('#010203')
    })
  })

  describe('hexToRgb and rgbToHex round trip', () => {
    it('should convert hex to RGB and back to hex', () => {
      const originalHex = '#3b82f6'
      const rgb = hexToRgb(originalHex)
      const resultHex = rgbToHex(rgb.r, rgb.g, rgb.b)
      expect(resultHex).toBe(originalHex)
    })

    it('should convert RGB to hex and back to RGB', () => {
      const originalRgb = { r: 59, g: 130, b: 246 }
      const hex = rgbToHex(originalRgb.r, originalRgb.g, originalRgb.b)
      const resultRgb = hexToRgb(hex)
      expect(resultRgb).toEqual(originalRgb)
    })

    it('should handle multiple round trips', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000']
      colors.forEach((hex) => {
        const rgb = hexToRgb(hex)
        const resultHex = rgbToHex(rgb.r, rgb.g, rgb.b)
        expect(resultHex).toBe(hex)
      })
    })
  })
})
