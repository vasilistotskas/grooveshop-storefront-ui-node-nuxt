import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { requestLocale } from '~~/server/utils/locale'
import { createTestEvent } from '~~/test/helpers/nitro'
import type { H3Event } from 'h3'

describe('requestLocale', () => {
  it('reads the locale 1.locale.ts resolved for the request', () => {
    expect(requestLocale(createTestEvent({ context: { locale: 'en' } }))).toBe('en')
  })

  it('answers the default locale before the middleware ran (a warm cache getKey, /_nuxt)', () => {
    expect(requestLocale(createTestEvent())).toBe(DEFAULT_LOCALE)
  })

  it('answers the default locale without an event at all', () => {
    expect(requestLocale(undefined as unknown as H3Event)).toBe(DEFAULT_LOCALE)
  })
})
