<script lang="ts" setup>
import type { Locale } from '@nuxt/ui'

/**
 * `compact` is the header's form — a ghost control showing the locale
 * code ("EL"); without it the control names the language ("Ελληνικά"),
 * as the footer and the phone menu do.
 *
 * A `USelectMenu` with a globe, not `ULocaleSelect`: that component
 * hard-codes an emoji flag into its leading slot and does not forward
 * slots (nuxt/ui `locale/LocaleSelect.vue`, unchanged through v4.11.3),
 * so `leading-icon` is ignored. A flag is the wrong mark for a language
 * — English is not the United States — and Windows ships no flag
 * glyphs, so it rendered as the letters "US". The design draws a globe.
 *
 * Content width rather than the app config's form-field `w-full`: in
 * the header row a full-width control squeezed its neighbours to their
 * icons.
 */
withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const { locale, t } = useI18n()
const { setLanguage } = useUserLanguage()
const tenantStore = useTenantStore()

const emit = defineEmits(['languageChanged'])

const currentLocale = ref(locale.value)

/**
 * Only the locales this tenant actually serves, as Nuxt UI `Locale`
 * objects (`toUiLocales`) — each carries the language's own name.
 *
 * The i18n locale list is platform-wide and fixed at build time, so it
 * includes languages the current store 404s — see
 * `middleware/locale-available.global.ts`.
 */
const tenantLocales = computed<Locale<unknown>[]>(() =>
  toUiLocales(tenantStore.availableLocales),
)

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
  <USelectMenu
    v-if="tenantLocales.length > 1"
    v-model="currentLocale"
    :items="tenantLocales"
    value-key="code"
    :label-key="compact ? 'code' : 'name'"
    :search-input="false"
    :variant="compact ? 'ghost' : 'outline'"
    :trailing-icon="compact ? '' : undefined"
    leading-icon="i-heroicons-globe-alt"
    color="neutral"
    size="sm"
    :aria-label="t('change_language')"
    :ui="{
      base: 'w-auto rounded-full font-semibold',
      value: compact ? 'uppercase' : '',
      content: 'min-w-40',
    }"
  />
</template>

<i18n lang="yaml">
el:
  change_language: Αλλαγή γλώσσας
en:
  change_language: Change language
</i18n>
