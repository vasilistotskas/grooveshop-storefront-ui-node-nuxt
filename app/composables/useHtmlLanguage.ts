/**
 * The document's `<html lang dir>`: the locale's full BCP-47 `language`
 * (e.g. `el-GR`, so screen readers and search engines get region-specific
 * pronunciation hints) and its writing direction, both from
 * `LOCALE_PROPERTIES` (`i18n/locales.ts`). `setupPageHeader` sets it for
 * every page and `error.vue`, which renders outside `app.vue`, for the
 * error page: a document needs both, whichever of the two draws it.
 */
export function useHtmlLanguage() {
  const { $i18n } = useNuxtApp()

  const lang = computed(() => $i18n.localeProperties.value.language)
  const dir = computed(() => $i18n.localeProperties.value.dir)

  useHead({ htmlAttrs: { lang, dir } })
}
