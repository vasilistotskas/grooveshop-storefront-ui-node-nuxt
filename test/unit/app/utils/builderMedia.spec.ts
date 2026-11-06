import { describe, expect, it } from 'vitest'
import { builderMediaName } from '~/utils/builderMedia'

describe('builderMediaName', () => {
  it('is the file of the path media-stream serves', () => {
    expect(builderMediaName('media/shop_a/uploads/builder/hero.jpg')).toBe('hero.jpg')
  })

  it('reads an encoded name as it is written', () => {
    expect(builderMediaName('media/shop_a/uploads/builder/%CE%B2%CE%B9%CF%84%CF%81%CE%AF%CE%BD%CE%B1.webp')).toBe('βιτρίνα.webp')
  })

  it('keeps a path with no folder whole', () => {
    expect(builderMediaName('hero.jpg')).toBe('hero.jpg')
  })
})
