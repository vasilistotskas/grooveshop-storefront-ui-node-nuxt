<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />
    <PageBody>
      <div />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Δώστε σχόλια
</i18n>
