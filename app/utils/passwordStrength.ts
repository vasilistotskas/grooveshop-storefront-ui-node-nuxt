export type PasswordRequirement = 'length' | 'number' | 'lowercase' | 'uppercase'
export type PasswordStrengthColor = 'neutral' | 'error' | 'warning' | 'success'

/**
 * Letters are Unicode classes: `[a-z]` never matches Greek, so
 * «Καλημέρα2024» scored as if it had no letters at all.
 */
const REQUIREMENTS: ReadonlyArray<readonly [PasswordRequirement, RegExp]> = [
  ['length', /.{8,}/],
  ['number', /\d/],
  ['lowercase', /\p{Ll}/u],
  ['uppercase', /\p{Lu}/u],
]

/**
 * The one strength rubric every password form shares: length >= 8, a
 * digit, a lowercase and an uppercase letter, scored as the number met.
 *
 * The rubric is advisory: Django enforces only the length (8), "not all
 * digits", "not common" and "not like your details", so a form never
 * gates on the score. The words (labels, rule names) are each drawing's
 * own; this is the arithmetic.
 */
export function passwordStrength(password: string | null | undefined): {
  requirements: Array<{ id: PasswordRequirement, met: boolean }>
  score: number
  color: PasswordStrengthColor
} {
  const value = password ?? ''
  const requirements = REQUIREMENTS.map(([id, rule]) => ({ id, met: rule.test(value) }))
  const score = requirements.filter(requirement => requirement.met).length
  const color: PasswordStrengthColor = score === 0
    ? 'neutral'
    : score <= 2 ? 'error' : score === 3 ? 'warning' : 'success'
  return { requirements, score, color }
}
