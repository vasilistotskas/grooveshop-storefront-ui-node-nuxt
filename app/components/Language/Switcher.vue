<script lang="ts" setup>
const { locale, locales, t } = useI18n()
const { setLanguage } = useUserLanguage()

const emit = defineEmits(['languageChanged'])

const currentLocale = ref(locale.value)

// Keep the selector in sync with any external locale change (settings form,
// login-time syncFromUser, programmatic setLocale elsewhere).
watch(locale, (newLocale) => {
  if (newLocale !== currentLocale.value) {
    currentLocale.value = newLocale
  }
})

watch(currentLocale, async (newLocale) => {
  if (newLocale === locale.value) return
  const ok = await setLanguage(newLocale)
  if (ok) {
    emit('languageChanged', newLocale)
  }
  else {
    // revert if the server couldn't persist or the locale isn't supported.
    currentLocale.value = locale.value
  }
})
</script>

<template>
  <ULocaleSelect
    v-model="currentLocale"
    :locales="locales as any"
    color="neutral"
    variant="ghost"
    size="xl"
    :aria-label="t('change_language')"
  />
</template>

<i18n lang="yaml">
el:
  change_language: Άλλαξε γλώσσα
</i18n>
