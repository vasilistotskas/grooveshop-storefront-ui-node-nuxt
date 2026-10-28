/**
 * The stable identifiers `POST /api/texts/validate` answers a refused text
 * with. Django's editor branches on them, so they never change meaning.
 */
export const TEXT_VALIDATION_CODES = [
  'unknown_key',
  'locked_key',
  'syntax_error',
  'placeholder_mismatch',
] as const

export type TextValidationCode = typeof TEXT_VALIDATION_CODES[number]

export type TextValidation
  = | { ok: true }
    | { ok: false, code: TextValidationCode, detail: string }
