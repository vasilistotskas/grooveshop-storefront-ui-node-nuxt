<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />
    <PageBody>
      <div />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Πολιτική Επιστροφών
</i18n>
