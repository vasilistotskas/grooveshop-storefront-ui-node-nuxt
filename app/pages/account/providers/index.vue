<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      class="hidden"
      :text="t('title')"
    />
    <PageBody>
      <AccountProvidersManage>
        <AccountAuthSettingsNavigation />
      </AccountProvidersManage>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Πάροχοι
</i18n>
