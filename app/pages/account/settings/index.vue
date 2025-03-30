<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

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
    <PageTitle :text="t('title')" class="hidden" />

    <AccountSettingsForm>
      <AccountAuthSettingsNavigation />
    </AccountSettingsForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ρυθμίσεις
</i18n>
