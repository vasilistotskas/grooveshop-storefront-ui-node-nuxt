<script lang="ts" setup>
const props = defineProps<{
  html: string | null | undefined
}>()

const { t } = useI18n()

// Shares the blog body's sanitiser: product descriptions are the
// same admin-authored TinyMCE HTML and had the same silent
// iframe-stripping bug.
const sanitizedHtml = computed(() => sanitizeRichHtml(props.html))

const hasHtml = computed(() => sanitizedHtml.value.trim().length > 0)
</script>

<template>
  <div class="max-w-none pt-2 md:py-4">
    <div
      v-if="hasHtml"
      class="article"
      v-html="sanitizedHtml"
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
en:
  no_description_available: No description available
</i18n>
