import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { LOCALE_PROPERTIES } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import { renderedHtmlAttributes } from '~~/test/helpers/htmlAttributes'

/**
 * `<html lang dir>` from the page's locale (`LOCALE_PROPERTIES`): the full
 * BCP-47 language and the writing direction, together, as the head renders
 * them into the document.
 */
const Harness = defineComponent({
  setup() {
    useHtmlLanguage()
    return () => h('div')
  },
})

describe('useHtmlLanguage', () => {
  let initial: SupportedLocale = 'el'

  beforeEach(() => {
    initial = useNuxtApp().$i18n.locale.value
  })

  afterEach(() => {
    useNuxtApp().$i18n.locale.value = initial
  })

  it.each(['el', 'en'] as const)('sets the language and the direction of %s', async (locale) => {
    useNuxtApp().$i18n.locale.value = locale

    expect(await renderedHtmlAttributes(Harness)).toEqual({
      lang: LOCALE_PROPERTIES[locale].language,
      dir: LOCALE_PROPERTIES[locale].dir,
    })
  })
})
