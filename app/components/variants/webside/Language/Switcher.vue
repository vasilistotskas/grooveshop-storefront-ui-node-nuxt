<script lang="ts" setup>
import type { Locale } from '@nuxt/ui'

const { locale, t } = useStoreI18n('components/variants/webside/Language/Switcher')
const { setLanguage } = useUserLanguage()
const tenantStore = useTenantStore()

const emit = defineEmits(['languageChanged'])

const currentLocale = ref(locale.value)

/**
 * Only the locales this tenant actually serves.
 *
 * `ULocaleSelect` takes Nuxt UI `Locale` objects, NOT the
 * `@nuxtjs/i18n` locale objects from `useI18n().locales` — the two
 * shapes are unrelated, which is what forced the `as any` this
 * replaces. `toUiLocales` does the lookup and the narrowing.
 *
 * The i18n locale list is platform-wide and fixed at build time, so it
 * includes languages the current store 404s — see
 * `middleware/locale-available.global.ts`.
 */
const tenantLocales = computed<Locale<unknown>[]>(() =>
  toUiLocales(tenantStore.availableLocales),
)

/**
 * The control's accessible name: the language it shows, then what it does.
 * The language is composed here, not interpolated into the translated phrase,
 * so a text override cannot drop it (WCAG 2.5.3). The phrase had no copy at
 * all: the global i18n has no `change_language`, so a multilingual store's
 * switcher was named by the raw key.
 */
const accessibleName = computed(() => {
  const shown = tenantLocales.value.find(entry => entry.code === currentLocale.value)?.name ?? currentLocale.value
  return new Intl.ListFormat(locale.value, { type: 'unit', style: 'long' }).format([shown, t('change_language')])
})

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
    v-if="tenantLocales.length > 1"
    v-model="currentLocale"
    :locales="tenantLocales"
    color="neutral"
    variant="ghost"
    size="xl"
    :aria-label="accessibleName"
  />
</template>

<i18n lang="yaml">
el:
  change_language: Αλλαγή γλώσσας
en:
  change_language: Change language
</i18n>
