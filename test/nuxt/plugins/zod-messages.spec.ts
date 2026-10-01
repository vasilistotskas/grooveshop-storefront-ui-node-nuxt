import { describe, it, expect, beforeAll } from 'vitest'
import { z } from 'zod'
import zodMessages from '~/plugins/zod-messages.client'

/**
 * A shopper must not be shown Zod's developer wording.
 *
 * Measured on staging: submitting `/account/addresses/new` with a
 * field empty printed "Invalid input: expected string, received
 * undefined" under it, in English, on a Greek storefront. That form
 * validates with a GENERATED schema, which carries no messages of its
 * own — and hand-writing messages onto generated schemas is the thing
 * the project forbids, so the fix is a global error map.
 *
 * The assertions parse real schemas rather than reading the plugin's
 * source, because what matters is the string the field ends up
 * showing.
 */
const translations: Record<string, string> = {
  'validation.required': 'Απαιτούμενο',
  'validation.min': 'Τουλάχιστον {min} χαρακτήρες',
  'validation.max': 'Το πολύ {max} χαρακτήρες',
  'validation.length': 'Ακριβώς {length} χαρακτήρες',
  'validation.min_value': 'Τουλάχιστον {min}',
  'validation.max_value': 'Το πολύ {max}',
  'validation.greater_than': 'Μεγαλύτερη από {min}',
  'validation.less_than': 'Μικρότερη από {max}',
  'validation.min_items': 'Επιλέξτε τουλάχιστον {min}',
  'validation.max_items': 'Επιλέξτε το πολύ {max}',
  'validation.items_exact': 'Επιλέξτε ακριβώς {count}',
}

/** The message the one field of `schema` shows for `value`. */
const messageFor = (schema: z.ZodType, value: unknown) =>
  z.object({ field: schema }).safeParse({ field: value }).error!.issues[0]!.message

const t = (key: string, named?: Record<string, unknown>) => {
  const template = translations[key]
  if (!template) return key
  return template.replace(/\{(\w+)\}/g, (_, name) => String(named?.[name] ?? ''))
}

beforeAll(() => {
  // The plugin reads `$i18n` off the Nuxt app and calls `z.config`.
  const setup = (zodMessages as unknown as { setup: (app: unknown) => void }).setup
  setup({ $i18n: { t } })
})

describe('zod validation messages', () => {
  it('says the field is required instead of naming a type', () => {
    const result = z.object({ street: z.string() }).safeParse({})

    expect(result.success).toBe(false)
    const message = result.error!.issues[0]!.message
    expect(message).toBe('Απαιτούμενο')
    expect(message, 'Zod wording reached the shopper').not.toMatch(/expected|received|Invalid input/i)
  })

  it('carries the bound through on a length rule', () => {
    const tooShort = z.object({ zipcode: z.string().min(5) }).safeParse({ zipcode: 'abc' })
    expect(tooShort.error!.issues[0]!.message).toBe('Τουλάχιστον 5 χαρακτήρες')

    const tooLong = z.object({ title: z.string().max(3) }).safeParse({ title: 'abcdef' })
    expect(tooLong.error!.issues[0]!.message).toBe('Το πολύ 3 χαρακτήρες')
  })

  it('words an exact length as one', () => {
    expect(messageFor(z.string().length(5), 'abc')).toBe('Ακριβώς 5 χαρακτήρες')
  })

  // A number's bound is a value, not a length: "at least 1 characters"
  // under a quantity or a rating is what the shopper used to read.
  it.each([
    ['a number below its minimum', z.number().min(1), 0, 'Τουλάχιστον 1'],
    ['a number above its maximum', z.number().max(5), 6, 'Το πολύ 5'],
    ['an integer below its minimum', z.int().min(1), 0, 'Τουλάχιστον 1'],
    ['a positive number at zero', z.number().positive(), 0, 'Μεγαλύτερη από 0'],
    ['a number at an exclusive maximum', z.number().lt(10), 10, 'Μικρότερη από 10'],
    ['a bigint below its minimum', z.bigint().min(2n), 1n, 'Τουλάχιστον 2'],
  ])('words %s as a value', (_case, schema, value, expected) => {
    expect(messageFor(schema, value)).toBe(expected)
  })

  it.each([
    ['too few items', z.array(z.string()).min(2), ['a'], 'Επιλέξτε τουλάχιστον 2'],
    ['too many items', z.array(z.string()).max(1), ['a', 'b'], 'Επιλέξτε το πολύ 1'],
    ['the wrong item count', z.array(z.string()).length(2), ['a'], 'Επιλέξτε ακριβώς 2'],
    ['a set too small', z.set(z.string()).min(2), new Set(['a']), 'Επιλέξτε τουλάχιστον 2'],
  ])('words %s as a count', (_case, schema, value, expected) => {
    expect(messageFor(schema, value)).toBe(expected)
  })

  it('leaves a bound it has no wording for to Zod', () => {
    // A date's minimum is a timestamp; "at least 1735689600000" is no
    // better than Zod's own message.
    const message = messageFor(z.date().min(new Date('2026-01-01')), new Date('2025-01-01'))
    expect(message).not.toMatch(/χαρακτήρες|Τουλάχιστον/)
    expect(message.length).toBeGreaterThan(0)
  })

  it('leaves a schema\'s own message alone', () => {
    // The address form's phone `refine` passes its own translated text,
    // and a global map must not outrank it.
    const schema = z.object({
      phone: z.string().refine(() => false, { error: 'Μη έγκυρο τηλέφωνο' }),
    })
    expect(schema.safeParse({ phone: '123' }).error!.issues[0]!.message)
      .toBe('Μη έγκυρο τηλέφωνο')
  })

  it('does not invent wording for rules it has no translation for', () => {
    // A bad email should say it is a bad email, not something vague.
    const message = z.object({ email: z.email() }).safeParse({ email: 'nope' }).error!.issues[0]!.message
    expect(message).not.toBe('Απαιτούμενο')
    expect(message.length).toBeGreaterThan(0)
  })
})
