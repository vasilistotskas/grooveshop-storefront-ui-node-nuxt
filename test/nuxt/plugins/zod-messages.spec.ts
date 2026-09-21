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
}

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

  it("leaves a schema's own message alone", () => {
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
