import { describe, expect, it } from 'vitest'
import { WCAG_AA_TEXT_CONTRAST, contrastRatio, readableTextOn, relativeLuminance } from '~~/shared/utils/contrast'

describe('relativeLuminance', () => {
  it('spans 0 for black to 1 for white', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10)
  })
})

describe('contrastRatio', () => {
  it('is 21 between black and white, whichever comes first', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 10)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 10)
  })

  it('matches the ratios WAVE measured for the terracotta accent', () => {
    expect(contrastRatio('#ffffff', '#b3694b')).toBeCloseTo(4.17, 2)
    expect(contrastRatio('#171717', '#b3694b')).toBeCloseTo(4.30, 2)
  })
})

describe('readableTextOn', () => {
  it('keeps white on the platform blue and the ink on a light fill', () => {
    expect(readableTextOn('#1d4ed8')).toBe('#ffffff')
    expect(readableTextOn('#d09d75')).toBe('#171717')
    expect(readableTextOn('#ffffff')).toBe('#171717')
  })

  it('falls back to black where neither white nor the ink clears AA', () => {
    expect(readableTextOn('#b3694b')).toBe('#000000')
  })

  it('clears AA on every colour of a 4096-step sweep', () => {
    const steps = Array.from({ length: 16 }, (_, index) => (index * 17).toString(16).padStart(2, '0'))
    const failures = steps.flatMap(red => steps.flatMap(green => steps.map(blue => `#${red}${green}${blue}`)))
      .filter(background => contrastRatio(readableTextOn(background), background) < WCAG_AA_TEXT_CONTRAST)
    expect(failures).toEqual([])
  })
})
