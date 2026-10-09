import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { requestLocale } from '~~/server/utils/locale'
import { createTestEvent } from '~~/test/helpers/nitro'

describe('requestLocale', () => {
  it('reads the locale 1.locale.ts resolved for the request', () => {
    expect(requestLocale(createTestEvent({ context: { locale: 'en' } }))).toBe('en')
  })

  it('answers the default locale where the middleware does not run (/_nuxt, /_ipx, /assets)', () => {
    expect(requestLocale(createTestEvent())).toBe(DEFAULT_LOCALE)
  })
})
