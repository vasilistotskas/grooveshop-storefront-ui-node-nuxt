<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * The trail above an activity page: «Αρχική / Δράσεις / …», drawn as
 * plain text with a slash between the steps, the last one the current
 * page. Every step but the last is a link; a step's `to` is a route
 * name.
 */
defineProps<{
  items: { label: string, to?: RouteLocationNamedI18n }[]
}>()

const { t } = useI18n()
</script>

<template>
  <nav
    :aria-label="t('label')"
    class="text-sm font-semibold"
  >
    <ol class="flex flex-wrap items-center">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="flex items-center"
      >
        <NuxtLinkLocale
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="
            inline-flex min-h-11 items-center rounded-sm text-(--fy-text)
            underline underline-offset-3
            hover:text-(--fy-eyebrow)
            focus-visible:outline-3 focus-visible:outline-offset-3
            focus-visible:outline-(color:--fy-focus)
          "
        >
          {{ item.label }}
        </NuxtLinkLocale>
        <span
          v-else
          aria-current="page"
          class="text-(--fy-text)"
        >{{ item.label }}</span>
        <span
          v-if="index < items.length - 1"
          aria-hidden="true"
          class="mx-2 text-(--fy-text-muted)"
        >/</span>
      </li>
    </ol>
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Διαδρομή
en:
  label: Breadcrumb
</i18n>
