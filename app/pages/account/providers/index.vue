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
      md:gap-8 md:!p-0
    "
  >
    <PageTitle
      class="hidden"
      :text="t('title')"
    />

    <AccountProvidersManage>
      <AccountAuthSettingsNavigation />
    </AccountProvidersManage>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Πάροχοι
</i18n>
