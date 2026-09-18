<script lang="ts" setup>
/**
 * The operator's strip above the header — "Free shipping over 39€",
 * "Orders placed today ship tomorrow".
 *
 * Rendered on the SERVER and identically for every visitor, which is
 * what keeps it compatible with the cached anonymous render: dismissal
 * is per-visitor, and `UBanner` handles it without a per-visitor render
 * by writing the id to localStorage and hiding the bar through a class
 * on `<html>` before paint. Nothing here reads a cookie or the session.
 *
 * Fails silent: no setting, malformed JSON, or a shape the guard
 * rejects all render nothing. A bar is chrome, not content.
 */
const { locale } = useI18n()
const raw = useSettingValue('ANNOUNCEMENT_BAR')

const bar = computed(() => {
  const value = raw.value
  if (!value || value === '{}') return null
  const parsed = parseAnnouncementBarValue(value)
  if (!parsed) {
    log.warn({
      tag: 'announcement-bar',
      message: 'ANNOUNCEMENT_BAR setting failed shape validation',
    })
    return null
  }
  return parsed.enabled ? parsed : null
})

const text = computed(() =>
  bar.value ? announcementText(bar.value, locale.value) : '',
)

// Dismissal is remembered against this id, so a merchant re-shows the
// bar to everyone by changing it. Without one `UBanner` does not
// persist anything, which is the right default for an unversioned bar.
const bannerId = computed(() =>
  bar.value?.dismissible === false ? undefined : bar.value?.id,
)
</script>

<template>
  <UBanner
    v-if="bar"
    :id="bannerId"
    :icon="bar.icon"
    :title="text"
    :to="bar.link"
    :color="bar.color ?? 'secondary'"
    :close="bar.dismissible !== false"
    :ui="{
      root: 'z-40',
      title: `
        text-sm font-medium
        sm:truncate
      `,
    }"
  />
</template>
