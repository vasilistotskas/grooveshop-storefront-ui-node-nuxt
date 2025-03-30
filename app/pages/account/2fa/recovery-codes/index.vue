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
    <PageTitle
      :text="t('title')"
      class="hidden"
    />

    <Account2FaRecoveryCodes>
      <AccountAuthSettingsNavigation />
    </Account2FaRecoveryCodes>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κωδικοί Ανάκτησης
</i18n>
