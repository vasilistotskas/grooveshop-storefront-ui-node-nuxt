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
      :text="t('title')"
      class="hidden"
    />

    <Account2FaWebAuthnList>
      <AccountAuthSettingsNavigation />
    </Account2FaWebAuthnList>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κλειδιά ασφαλείας
</i18n>
