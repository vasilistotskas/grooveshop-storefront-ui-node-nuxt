<script lang="ts" setup>
const { t } = useI18n()

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Βοήθεια
</i18n>
