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
  <div
    v-if="hasHtml"
    class="article max-w-none text-[1.0625rem]/[1.65]"
    v-html="sanitizedHtml"
  />
  <p
    v-else
    class="text-muted"
  >
    {{ t('no_description_available') }}
  </p>
</template>

<i18n lang="yaml">
el:
  no_description_available: Δεν υπάρχει διαθέσιμη περιγραφή
en:
  no_description_available: No description available
</i18n>
