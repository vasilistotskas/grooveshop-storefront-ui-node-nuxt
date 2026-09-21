import { z } from 'zod'
import type { Composer } from 'vue-i18n'

/**
 * Translate Zod's own validation messages.
 *
 * The forms that validate with a GENERATED schema had no messages of
 * their own, so Zod's developer-facing defaults reached the shopper:
 * submitting the address form with a field empty printed
 *
 *   Invalid input: expected string, received undefined
 *
 * under the field, in English, on a Greek storefront. Measured on
 * staging 2026-09-21. The contact form was fine — it is hand-written
 * and carries its own messages — which is exactly why this only bit
 * the generated-schema forms.
 *
 * Fixing it per form would mean hand-writing messages onto generated
 * schemas, which is the thing the project forbids. A global error map
 * is the one place that reaches every schema without touching any of
 * them, and `validation.required` / `min` / `max` already exist.
 *
 * Client-only on purpose: the same Zod instance parses API responses
 * on the server through `parseDataAs`, and those failures are read by
 * developers in logs. Translating them would make a contract drift
 * harder to read, and no shopper ever sees them.
 *
 * Lowest precedence by design — a schema's own `error` (the address
 * form's phone `refine`, for one) still wins.
 */
export default defineNuxtPlugin({
  name: 'zod-messages',
  // `jitless` is set by app/vendor/zod-jitless.ts at module scope,
  // before any plugin. This only adds to the same config; the error map
  // is consulted at PARSE time, so arriving later is fine.
  setup(nuxtApp) {
    const { t } = nuxtApp.$i18n as Composer

    z.config({
      customError: (issue) => {
        switch (issue.code) {
          case 'invalid_type':
            // A missing value and a wrong-typed one are the same thing
            // to someone filling in a form: they left it blank.
            return issue.input === undefined || issue.input === null
              ? t('validation.required')
              : undefined

          case 'too_small':
            return typeof issue.minimum === 'number'
              ? t('validation.min', { min: issue.minimum })
              : undefined

          case 'too_big':
            return typeof issue.maximum === 'number'
              ? t('validation.max', { max: issue.maximum })
              : undefined

          default:
            // Everything else keeps Zod's wording rather than inventing
            // a vague one — a bad email should say so, not "invalid".
            return undefined
        }
      },
    })
  },
})
