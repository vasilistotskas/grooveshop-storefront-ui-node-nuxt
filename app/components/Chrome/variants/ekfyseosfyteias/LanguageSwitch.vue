<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The language switch of the «Εκ φύσεως Φυτειάς» header: a round button
 * per other language the store serves (one, for el + en), showing that
 * language's code and linking to the page the visitor is on, in it.
 *
 * A link, not a menu that navigates in script: it works before hydration
 * and without JavaScript, and crawlers follow it (`hreflang`). Its name
 * is the target language's own name ("English", "Ελληνικά"), in that
 * language (`lang`), so a screen reader pronounces it right.
 *
 * Only the locales the store serves (`Tenant.available_locales`); a
 * Greek-only store renders nothing.
 */
const { locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const tenantStore = useTenantStore()

// `switchLocalePath` answers '' for a route with no page in that language.
const others = computed(() =>
  tenantStore.availableLocales
    .filter(code => code !== locale.value)
    .flatMap((code) => {
      const [entry] = toUiLocales([code])
      const to = switchLocalePath(code)
      return entry && to ? [{ code, name: entry.name, to }] : []
    }),
)
</script>

<template>
  <NuxtLink
    v-for="other in others"
    :key="other.code"
    :to="other.to"
    :hreflang="other.code"
    :lang="other.code"
    :aria-label="other.name"
    class="
      inline-flex size-11 items-center justify-center rounded-full border-2
      border-(color:--fy-text) text-sm font-bold tracking-[0.04em]
      text-(--fy-text) uppercase
      hover:bg-(--fy-chip)
      focus-visible:outline-3 focus-visible:outline-offset-2
      focus-visible:outline-(color:--fy-focus)
    "
  >
    {{ other.code }}
  </NuxtLink>
</template>
