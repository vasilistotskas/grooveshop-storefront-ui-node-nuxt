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
      md:gap-8 md:!p-0
    "
  >
    <PageTitle
      class="hidden"
      :text="t('title')"
    />

    <AccountProvidersManage>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </AccountProvidersManage>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Πάροχοι
</i18n>
