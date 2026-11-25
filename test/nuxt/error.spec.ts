import { describe, expect, it } from 'vitest'
import ErrorShell from '~/error.vue'
import { setTenant } from '~~/test/helpers/tenant'
import { LOCALE_PROPERTIES } from '~~/i18n/locales'
import { renderedHtmlAttributes } from '~~/test/helpers/htmlAttributes'

/**
 * The error page renders outside `app.vue`, so `setupPageHeader` never
 * runs for it: the document of a 404 still needs the language and its
 * direction, as every other page has them.
 */
describe('error.vue', () => {
  it('declares the language and the direction of a 404 page', async () => {
    setTenant()
    const locale = useNuxtApp().$i18n.locale.value as keyof typeof LOCALE_PROPERTIES

    expect(await renderedHtmlAttributes(ErrorShell, { error: { statusCode: 404, statusMessage: 'Page not found' } })).toEqual({
      lang: LOCALE_PROPERTIES[locale].language,
      dir: LOCALE_PROPERTIES[locale].dir,
    })
  })
})
