/**
 * sRGB <-> OKLab <-> OKLCH, and gamut mapping into sRGB, as CSS Color 4 defines
 * them: its sample code (https://drafts.csswg.org/css-color-4/conversions.js,
 * the matrices recalculated for a consistent D65 white and 64-bit precision)
 * and its "Binary Search Gamut Mapping with Local MINDE" (section 14.2.2) with
 * ΔEOK (section 20.3). The theme's colour scales are made with it, and stored
 * as `#RRGGBB`, so a page and Django read the same colours.
 */

/** A colour in OKLCH: lightness 0 to 1, chroma from 0, hue in degrees (NaN when there is none). */
export interface Oklch {
  l: number
  c: number
  h: number
}

type Vector = readonly [number, number, number]
type Matrix = readonly [Vector, Vector, Vector]

/** `f` over each of the three components. */
const each = ([x, y, z]: Vector, f: (component: number) => number): Vector => [f(x), f(y), f(z)]

function multiply(matrix: Matrix, [x, y, z]: Vector): Vector {
  return [
    matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z,
    matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z,
    matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z,
  ]
}

const LINEAR_SRGB_TO_XYZ: Matrix = [
  [506752 / 1228815, 87881 / 245763, 12673 / 70218],
  [87098 / 409605, 175762 / 245763, 12673 / 175545],
  [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
]

const XYZ_TO_LINEAR_SRGB: Matrix = [
  [12831 / 3959, -329 / 214, -1974 / 3959],
  [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
  [705 / 12673, -2585 / 12673, 705 / 667],
]

const XYZ_TO_LMS: Matrix = [
  [0.8190224379967030, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
]

const LMS_TO_OKLAB: Matrix = [
  [0.2104542683093140, 0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.4285922420485799, 0.4505937096174110],
  [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
]

const LMS_TO_XYZ: Matrix = [
  [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
  [-0.0405757452148008, 1.1122868032803170, -0.0717110580655164],
  [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
]

const OKLAB_TO_LMS: Matrix = [
  [1.0000000000000000, 0.3963377773761749, 0.2158037573099136],
  [1.0000000000000000, -0.1055613458156586, -0.0638541728258133],
  [1.0000000000000000, -0.0894841775298119, -1.2914855480194092],
]

/** Below this chroma a colour has no hue (CSS Color 4, `OKLab_to_OKLCH`). */
const ACHROMATIC_CHROMA = 0.000004

/** The colour difference under which a clipped colour counts as the same (CSS Color 4, 14.2.2). */
const JUST_NOTICEABLE_DIFFERENCE = 0.02
const GAMUT_MAPPING_EPSILON = 0.0001

/** sRGB gamma decode, extended to negative values by reflection (`lin_sRGB`). */
export function linearSrgb(channel: number): number {
  const magnitude = Math.abs(channel)
  return magnitude <= 0.04045 ? channel / 12.92 : Math.sign(channel) * ((magnitude + 0.055) / 1.055) ** 2.4
}

/** sRGB gamma encode, the inverse of `linearSrgb` (`gam_sRGB`). */
export function gammaSrgb(channel: number): number {
  const magnitude = Math.abs(channel)
  return magnitude > 0.0031308 ? Math.sign(channel) * (1.055 * magnitude ** (1 / 2.4) - 0.055) : 12.92 * channel
}

/** CIE XYZ (D65) to OKLab (`XYZ_to_OKLab`). */
export function xyzToOklab(xyz: Vector): Vector {
  return multiply(LMS_TO_OKLAB, each(multiply(XYZ_TO_LMS, xyz), Math.cbrt))
}

/** OKLab to CIE XYZ (D65) (`OKLab_to_XYZ`). */
export function oklabToXyz(oklab: Vector): Vector {
  return multiply(LMS_TO_XYZ, each(multiply(OKLAB_TO_LMS, oklab), value => value ** 3))
}

/** Gamma-encoded sRGB channels (0 to 1 in gamut) to OKLCH. */
export function srgbToOklch(rgb: Vector): Oklch {
  const [l, a, b] = xyzToOklab(multiply(LINEAR_SRGB_TO_XYZ, each(rgb, linearSrgb)))
  const c = Math.hypot(a, b)
  const hue = Math.atan2(b, a) * 180 / Math.PI
  return { l, c, h: c <= ACHROMATIC_CHROMA ? Number.NaN : (hue + 360) % 360 }
}

function oklchToOklab({ l, c, h }: Oklch): Vector {
  const radians = (Number.isNaN(h) ? 0 : h) * Math.PI / 180
  return [l, c * Math.cos(radians), c * Math.sin(radians)]
}

/** OKLCH to gamma-encoded sRGB channels, unclamped: a colour outside sRGB has channels outside 0 to 1. */
export function oklchToSrgb(color: Oklch): Vector {
  return each(multiply(XYZ_TO_LINEAR_SRGB, oklabToXyz(oklchToOklab(color))), gammaSrgb)
}

const inGamut = (rgb: Vector) => rgb.every(channel => channel >= 0 && channel <= 1)
const clip = (rgb: Vector): Vector => each(rgb, channel => Math.min(1, Math.max(0, channel)))

/** ΔEOK: the Euclidean distance between two colours in OKLab (CSS Color 4, 20.3). */
function deltaEok(one: Vector, two: Vector): number {
  return Math.hypot(one[0] - two[0], one[1] - two[1], one[2] - two[2])
}

const oklabOfSrgb = (rgb: Vector) => xyzToOklab(multiply(LINEAR_SRGB_TO_XYZ, each(rgb, linearSrgb)))

/**
 * The sRGB colour an OKLCH colour shows as: itself when sRGB holds it, else
 * the nearest one of the same lightness and hue, found by CSS Color 4's binary
 * search on chroma with local MINDE (section 14.2.2): a clipped colour within
 * a just-noticeable difference is taken as it is.
 */
export function gamutMapToSrgb(origin: Oklch): Vector {
  if (origin.l >= 1) return [1, 1, 1]
  if (origin.l <= 0) return [0, 0, 0]
  if (inGamut(oklchToSrgb(origin))) return oklchToSrgb(origin)

  const current = { ...origin }
  let clipped = clip(oklchToSrgb(current))
  if (deltaEok(oklabOfSrgb(clipped), oklchToOklab(current)) < JUST_NOTICEABLE_DIFFERENCE) return clipped

  let min = 0
  let max = origin.c
  let minInGamut = true
  while (max - min > GAMUT_MAPPING_EPSILON) {
    current.c = (min + max) / 2
    if (minInGamut && inGamut(oklchToSrgb(current))) {
      min = current.c
      continue
    }
    clipped = clip(oklchToSrgb(current))
    const difference = deltaEok(oklabOfSrgb(clipped), oklchToOklab(current))
    if (difference < JUST_NOTICEABLE_DIFFERENCE) {
      if (JUST_NOTICEABLE_DIFFERENCE - difference < GAMUT_MAPPING_EPSILON) return clipped
      minInGamut = false
      min = current.c
    }
    else {
      max = current.c
    }
  }
  return clipped
}

/** `#RRGGBB` to gamma-encoded sRGB channels, 0 to 1. */
export function srgbFromHex(hex: string): Vector {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16) / 255
  return [channel(1), channel(3), channel(5)]
}

/** Gamma-encoded sRGB channels to `#rrggbb`, each rounded to the nearest 8-bit value (clamped to the gamut). */
export function hexFromSrgb(rgb: Vector): string {
  return `#${clip(rgb).map(channel => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`
}
