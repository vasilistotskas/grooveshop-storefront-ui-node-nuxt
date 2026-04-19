<script lang="ts" setup>
/**
 * Product description panel — shared between the PDP desktop `<UTabs>`
 * and mobile `<UAccordion>` so both layouts render identical markup
 * without duplicating the description/empty-state copy.
 */

const props = defineProps<{
  html: string | null | undefined
}>()

const { t } = useI18n()

const hasHtml = computed(() => !!props.html && props.html.trim().length > 0)
</script>

<template>
  <div class="max-w-none pt-2 md:py-4">
    <div
      v-if="hasHtml"
      class="article"
      v-html="html"
    />
    <p
      v-else
      class="text-gray-500 dark:text-gray-200"
    >
      {{ t('no_description_available') }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  no_description_available: Δεν υπάρχει διαθέσιμη περιγραφή
</i18n>
