import type { ContrastRule, ContrastSide } from '../types/builder'
import { HEX_COLOR_RE } from '../theme/constants'
import { contrastRatio } from '../utils/contrast'

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
 * The colour one side of a rule names: a literal `#RRGGBB`, or the
 * `#RRGGBB` at its pointer. Throws for a pointer that holds no colour:
 * the theme's schema requires every colour a rule names, so that is a
 * catalogue that contradicts itself, never a theme to pass.
 */
export function contrastSideColor(settings: unknown, side: ContrastSide): string {
  const value = side.startsWith('#') ? side : valueAt(settings, side)
  if (typeof value !== 'string' || !HEX_COLOR_RE.test(value)) {
    throw new Error(`The contrast side "${side}" is not a #RRGGBB colour`)
  }
  return value
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
 * The pointer a failed rule is reported at: the side that is a pointer, the
 * foreground when both are, `/settings` when neither is (as Django reports
 * `insufficient_contrast`).
 */
export function contrastRulePath(rule: ContrastRule): string {
  if (!rule.foreground.startsWith('#')) return rule.foreground
  if (!rule.background.startsWith('#')) return rule.background
  return '/settings'
}
