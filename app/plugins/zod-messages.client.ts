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

          // A bound means what its `origin` says: a string's is a length,
          // a number's a value, an array's a count. One "characters"
          // message for all of them told a shopper who skipped a rating
          // it needed "at least 1 characters". Any other origin (a date,
          // a file) keeps Zod's wording rather than a wrong one.
          case 'too_small': {
            const min = issue.minimum.toString()
            switch (issue.origin) {
              case 'string':
                return issue.exact
                  ? t('validation.length', { length: min })
                  : t('validation.min', { min })
              case 'number':
              case 'int':
              case 'bigint':
                return issue.inclusive === false
                  ? t('validation.greater_than', { min })
                  : t('validation.min_value', { min })
              case 'array':
              case 'set':
                return issue.exact
                  ? t('validation.items_exact', { count: min })
                  : t('validation.min_items', { min })
              default:
                return undefined
            }
          }

          case 'too_big': {
            const max = issue.maximum.toString()
            switch (issue.origin) {
              case 'string':
                return issue.exact
                  ? t('validation.length', { length: max })
                  : t('validation.max', { max })
              case 'number':
              case 'int':
              case 'bigint':
                return issue.inclusive === false
                  ? t('validation.less_than', { max })
                  : t('validation.max_value', { max })
              case 'array':
              case 'set':
                return issue.exact
                  ? t('validation.items_exact', { count: max })
                  : t('validation.max_items', { max })
              default:
                return undefined
            }
          }

          default:
            // Everything else keeps Zod's wording rather than inventing
            // a vague one — a bad email should say so, not "invalid".
            return undefined
        }
      },
    })
  },
})
