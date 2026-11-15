import type { ContrastColour, ContrastRule, ContrastSide } from '../types/builder'
import { HEX_COLOR_RE } from '../theme/constants'
import { contrastRatio } from '../utils/contrast'
import { mixOklab } from '../utils/oklch'

/** How a contrast rule came out on a document's root settings. */
export interface ContrastOutcome {
  rule: ContrastRule
  /** WCAG 2.2 contrast between the two colours, unrounded. */
  ratio: number
  pass: boolean
}

/**
 * The value at an RFC 6901 pointer into `settings` (`~1` is `/`, `~0` is
 * `~`), or `undefined` where nothing is.
 */
function valueAt(settings: unknown, pointer: string): unknown {
  return pointer.slice(1).split('/').reduce<unknown>((value, token) => {
    if (typeof value !== 'object' || value === null) return undefined
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~')
    return Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined
  }, settings)
}

/**
 * The colour one side of a rule names: a literal `#RRGGBB`, the `#RRGGBB`
 * at its pointer, or a mix of two of those as the page draws it
 * (`mixOklab`). Throws for a pointer that holds no colour: the theme's
 * schema requires every colour a rule names, so that is a catalogue that
 * contradicts itself, never a theme to pass.
 */
export function contrastSideColor(settings: unknown, side: ContrastSide): string {
  if (typeof side !== 'string') return mixOklab(contrastSideColor(settings, side.mix), contrastSideColor(settings, side.toward), side.percent)
  const value = side.startsWith('#') ? side : valueAt(settings, side)
  if (typeof value !== 'string' || !HEX_COLOR_RE.test(value)) {
    throw new Error(`The contrast side "${side}" is not a #RRGGBB colour`)
  }
  return value
}

/** The pointer a side reads, if it reads one: its own, else its mix's colour's, else what it mixes toward. */
export function contrastSidePointer(side: ContrastSide): ContrastColour | undefined {
  const own = (colour: ContrastColour) => colour.startsWith('#') ? undefined : colour
  return typeof side === 'string' ? own(side) : own(side.mix) ?? own(side.toward)
}

/**
 * Every rule on `settings`, in order: the ratio and whether it reaches the
 * rule's `min` (compared unrounded). The editor shows them all; Django
 * holds the same rules over the same settings and refuses a publish on a
 * failed `error` (`test/fixtures/builder/contrast-cases.json` is what both
 * sides are held to).
 */
export function evaluateContrastRules(settings: unknown, rules: readonly ContrastRule[]): ContrastOutcome[] {
  return rules.map((rule) => {
    const ratio = contrastRatio(contrastSideColor(settings, rule.foreground), contrastSideColor(settings, rule.background))
    return { rule, ratio, pass: ratio >= rule.min }
  })
}

/**
 * The pointer a failed rule is reported at: the pointer its foreground reads
 * (a mix reads the colour it mixes), else its background's, `/settings` when
 * neither reads one (as Django reports `insufficient_contrast`).
 */
export function contrastRulePath(rule: ContrastRule): string {
  return contrastSidePointer(rule.foreground) ?? contrastSidePointer(rule.background) ?? '/settings'
}
