/**
 * WCAG 2.x contrast for `#RRGGBB` colours: one implementation for the
 * tenant theme's `--ui-on-secondary` (`server/utils/themeTokens.ts`)
 * and for any component that puts text on an operator-chosen fill.
 */

/** WCAG 2.x minimum contrast for normal-size text (SC 1.4.3, level AA). */
export const WCAG_AA_TEXT_CONTRAST = 4.5

const WHITE = '#ffffff'
/** The platform's near-black ink, preferred over pure black wherever it is readable. */
const INK = '#171717'
const BLACK = '#000000'

/** WCAG 2.x relative luminance of a `#RRGGBB` colour, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const channel = (index: number) => {
    const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

/** WCAG 2.x contrast ratio between two `#RRGGBB` colours, 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)]
    .sort((a, b) => b - a) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * The text colour for a solid `background`, always at least AA: white
 * where white clears it, else the platform ink where that does, else
 * black. Black never fails where white does — white drops under 4.5:1
 * above luminance 0.183, where black is already 4.67:1 — so the last
 * step closes the band between the two that neither white nor ink
 * reaches: terracotta `#b3694b` is 4.17:1 in white and 4.30:1 in ink,
 * and 5.04:1 in black.
 */
export function readableTextOn(background: string): string {
  if (contrastRatio(WHITE, background) >= WCAG_AA_TEXT_CONTRAST) return WHITE
  if (contrastRatio(INK, background) >= WCAG_AA_TEXT_CONTRAST) return INK
  return BLACK
}
