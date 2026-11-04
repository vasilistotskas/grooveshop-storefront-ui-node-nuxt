import { describe, expect, it } from 'vitest'
import type { Oklch } from '~~/shared/utils/oklch'
import { gamutMapToSrgb, gammaSrgb, hexFromSrgb, linearSrgb, oklchToSrgb, srgbFromHex, srgbToOklch, xyzToOklab } from '~~/shared/utils/oklch'

/**
 * Every expected value here is a published one: CSS Color 4
 * (https://drafts.csswg.org/css-color-4/, its examples and its sample code)
 * or Björn Ottosson's table of OKLab test values
 * (https://bottosson.github.io/posts/oklab/). Each is compared to the
 * precision its source gives.
 */
const expectClose = (actual: readonly number[], expected: readonly number[], digits: number) => {
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, digits))
}

/** ΔEOK between two OKLCH colours: their distance in OKLab (CSS Color 4, 20.3). */
const deltaEok = (one: Oklch, two: Oklch) => {
  const ab = ({ c, h }: Oklch) => [c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)] as const
  const [a1, b1] = ab(one)
  const [a2, b2] = ab(two)
  return Math.hypot(one.l - two.l, a1 - a2, b1 - b2)
}

/** The just-noticeable difference CSS Color 4's gamut mapping works to (14.2.2). */
const JND = 0.02

describe('the sRGB transfer function', () => {
  it('decodes and encodes back to the same value, both sides of the linear segment and below zero', () => {
    // Not at 0.04045 itself: the two segments of sRGB meet there only to 3e-8.
    for (const value of [-0.5, -0.02, 0, 0.003, 0.04, 0.2, 0.5, 1]) {
      expect(gammaSrgb(linearSrgb(value))).toBeCloseTo(value, 12)
    }
  })

  it('is linear up to 0.04045 and a 2.4 power above', () => {
    expect(linearSrgb(0.04)).toBeCloseTo(0.04 / 12.92, 15)
    expect(linearSrgb(0.5)).toBeCloseTo(((0.5 + 0.055) / 1.055) ** 2.4, 15)
  })
})

describe('xyzToOklab', () => {
  // Ottosson's table, to the three places it gives. CSS Color 4 recalculated
  // the matrices for a consistent D65 white, which moves the fourth place.
  it.each([
    [[0.950, 1, 1.089], [1, 0, 0]],
    [[1, 0, 0], [0.450, 1.236, -0.019]],
    [[0, 1, 0], [0.922, -0.671, 0.263]],
    [[0, 0, 1], [0.153, -1.415, -0.449]],
  ] as const)('turns XYZ %j into the published OKLab %j', (xyz, oklab) => {
    expectClose(xyzToOklab(xyz), oklab, 2)
  })
})

describe('srgbToOklch and oklchToSrgb', () => {
  it('reads #6c88ea as CSS Color 4 writes it, oklch(65% 0.15 270)', () => {
    const { l, c, h } = srgbToOklch(srgbFromHex('#6c88ea'))

    // The hex is rounded to 8 bits a channel, which moves the third place.
    expectClose([l, c, h / 360], [0.65, 0.15, 270 / 360], 2)
  })

  it('writes oklch(65% 0.15 270) as #6c88ea', () => {
    expect(hexFromSrgb(oklchToSrgb({ l: 0.65, c: 0.15, h: 270 }))).toBe('#6c88ea')
  })

  it('gives oklch(65% 0.25 270), outside sRGB, the unclamped channels CSS Color 4 lists, color(srgb 0.3475 0.4707 1.146)', () => {
    expectClose(oklchToSrgb({ l: 0.65, c: 0.25, h: 270 }), [0.3475, 0.4707, 1.146], 3)
  })

  it('puts the sRGB blue primary at hue 264.06, as CSS Color 4 does', () => {
    // The spec gives it in a figure, to two places.
    expect(Math.abs(srgbToOklch([0, 0, 1]).h - 264.06)).toBeLessThan(0.01)
  })

  it('gives a grey no hue, and white a lightness of 1', () => {
    expect(srgbToOklch(srgbFromHex('#777777')).h).toBeNaN()
    expect(srgbToOklch([1, 1, 1]).l).toBeCloseTo(1, 6)
  })

  it('brings every colour of a 4096-step sweep back to its own hex', () => {
    const steps = Array.from({ length: 16 }, (_, index) => (index * 17).toString(16).padStart(2, '0'))
    const hexes = steps.flatMap(red => steps.flatMap(green => steps.map(blue => `#${red}${green}${blue}`)))

    expect(hexes.filter(hex => hexFromSrgb(oklchToSrgb(srgbToOklch(srgbFromHex(hex)))) !== hex)).toEqual([])
  })
})

describe('gamutMapToSrgb', () => {
  it('maps Display P3 yellow, oklch(0.96476 0.24503 110.23), within a JND of the color(srgb 0.99116 0.99733 0.00001) of CSS Color 4', () => {
    // The spec's figure lowers chroma until the colour is in gamut; local
    // MINDE stops as soon as clipping costs less than a JND.
    const mapped = srgbToOklch(gamutMapToSrgb({ l: 0.96476, c: 0.24503, h: 110.23 }))

    expect(deltaEok(mapped, srgbToOklch([0.99116, 0.99733, 0.00001]))).toBeLessThan(JND)
  })

  // Clipping alone moves these by up to 0.125 in lightness and 7 degrees in hue.
  it.each([
    { l: 0.65, c: 0.25, h: 270 },
    { l: 0.5, c: 0.4, h: 30 },
    { l: 0.9, c: 0.3, h: 140 },
    { l: 0.3, c: 0.3, h: 300 },
  ])('lowers the chroma of %j, keeping lightness and hue within the clip a JND allows', (origin) => {
    const mapped = srgbToOklch(gamutMapToSrgb(origin))

    expect(mapped.c).toBeLessThan(origin.c)
    expect(Math.abs(mapped.l - origin.l)).toBeLessThan(JND)
    expect(Math.abs(mapped.h - origin.h)).toBeLessThan(2)
  })

  it('returns a colour sRGB holds as it is', () => {
    expectClose(gamutMapToSrgb({ l: 0.65, c: 0.15, h: 270 }), oklchToSrgb({ l: 0.65, c: 0.15, h: 270 }), 12)
  })

  it('maps a lightness of 1 or more to white and of 0 or less to black, as the spec does', () => {
    expect(gamutMapToSrgb({ l: 1.2, c: 0.3, h: 30 })).toEqual([1, 1, 1])
    expect(gamutMapToSrgb({ l: 0, c: 0.3, h: 30 })).toEqual([0, 0, 0])
  })

  it('always lands inside sRGB', () => {
    const channels = Array.from({ length: 24 }, (_, step) => step * 15)
      .flatMap(h => [0.1, 0.5, 0.9].flatMap(l => gamutMapToSrgb({ l, c: 0.4, h })))

    expect(channels.filter(channel => channel < 0 || channel > 1)).toEqual([])
  })
})
