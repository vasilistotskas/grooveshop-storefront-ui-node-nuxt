<script lang="ts" setup>
const { t } = useI18n()

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center"
    />

    <AccountEmailManage />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αλλαγή email
</i18n>
