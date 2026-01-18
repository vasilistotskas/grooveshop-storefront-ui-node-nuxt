export function useDateLocale() {
  const { $i18n } = useNuxtApp()

  const dateLocale = computed(() => {
    const currentLocale = $i18n.locales.value.find(l => l.code === $i18n.locale.value)
    return currentLocale?.language || 'en-US'
  })

  return {
    dateLocale,
  }
}
