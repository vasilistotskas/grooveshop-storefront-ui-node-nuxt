/**
 * THE reader for the operator's announcement bar, shared by every design's
 * strip: the typed `announcementBar` Django serves on `/settings/public`,
 * its wording for the visitor's locale, and the id a dismissal is
 * remembered against.
 *
 * `bar` is `null` when there is none or it is switched off: a bar is
 * chrome, so a design renders nothing then.
 */
export function useAnnouncementBar() {
  const { locale } = useI18n({ useScope: 'global' })
  const { announcementBar } = useStoreSettings()

  const bar = computed(() => announcementBar.value?.enabled ? announcementBar.value : null)

  const text = computed(() =>
    bar.value ? announcementText(bar.value, locale.value) : '',
  )

  // The phone's wording, when the operator wrote one; the bar is a single
  // line and a phone has less of it.
  const shortText = computed(() =>
    bar.value ? announcementShortText(bar.value, locale.value) : '',
  )

  // Dismissal is remembered against this id, so a merchant re-shows the
  // bar to everyone by changing it. Without one `UBanner` does not
  // persist anything, which is the right default for an unversioned bar.
  const bannerId = computed(() =>
    bar.value?.dismissible === false ? undefined : bar.value?.id,
  )

  return { bar, text, shortText, bannerId }
}
