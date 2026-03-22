<script lang="ts" setup>
const { locale, locales, t, setLocale } = useI18n()

const emit = defineEmits(['languageChanged'])

const currentLocale = ref(locale.value)

watch(currentLocale, (newLocale) => {
  if (newLocale !== locale.value) {
    setLocale(newLocale)
    emit('languageChanged', newLocale)
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
