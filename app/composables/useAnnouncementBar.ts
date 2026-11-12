/**
 * THE reader for the operator's announcement bar, shared by every design's
 * strip: the typed `announcementBar` Django serves on `/settings/public`,
 * its wording for the visitor's locale, and the id a dismissal is
 * remembered against.
 *
 * `bar` is `null` when there is none or it is switched off: a bar is
 * chrome, so a design renders nothing then.
 *
 * The wording may name live figures (`{freeShippingThreshold}`,
 * `{dispatchCutoff}`, `shared/utils/announcementBar.ts`). They are filled in
 * here, so the server render and the browser print the same sentence, and a
 * bar that names a figure the store has no value for is `null` too: neither
 * a hole nor a raw `{token}` reaches a visitor.
 *
 * The bar is on every page, so a figure is read only when some wording of
 * the bar names it. That is decided when the composable runs, with the
 * other reads of the settings already in the render (the settings are part
 * of the page before the chrome draws), and the read starts then, before
 * anything is awaited.
 */
export function useAnnouncementBar() {
  const { $i18n } = useNuxtApp()
  const { locale } = useI18n({ useScope: 'global' })
  const { announcementBar, values } = useStoreSettings()

  const named = announcementBar.value?.enabled ? announcementTokens(announcementTexts(announcementBar.value)) : []
  const freeShipping = named.includes('freeShippingThreshold') ? useFreeShippingInfo() : null

  // The figures that have a value now; a figure with none is left out.
  const figures = computed<AnnouncementTokenValues>(() => {
    const threshold = freeShipping?.data.value?.minThreshold
    const cutoff = parseDispatchCutoff(values.value?.dispatchCutoff)
    return {
      ...(threshold && threshold > 0 && { freeShippingThreshold: $i18n.n(threshold, 'currency') }),
      ...(cutoff && { dispatchCutoff: cutoff }),
    }
  })

  const enabled = computed(() => announcementBar.value?.enabled ? announcementBar.value : null)

  // The wording this visitor sees; a missing figure in it hides the bar.
  const shown = computed(() => {
    const value = enabled.value
    if (!value) return []
    return [announcementText(value, locale.value), announcementShortText(value, locale.value)]
  })

  const bar = computed(() =>
    enabled.value && missingAnnouncementTokens(shown.value, figures.value).length === 0 ? enabled.value : null,
  )

  const text = computed(() =>
    bar.value ? fillAnnouncementTokens(announcementText(bar.value, locale.value), figures.value) : '',
  )

  // The phone's wording, when the operator wrote one; the bar is a single
  // line and a phone has less of it.
  const shortText = computed(() =>
    bar.value ? fillAnnouncementTokens(announcementShortText(bar.value, locale.value), figures.value) : '',
  )

  // Dismissal is remembered against this id, so a merchant re-shows the
  // bar to everyone by changing it. Without one `UBanner` does not
  // persist anything, which is the right default for an unversioned bar.
  const bannerId = computed(() =>
    bar.value?.dismissible === false ? undefined : bar.value?.id,
  )

  return { bar, text, shortText, bannerId }
}
