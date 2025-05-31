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

      md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="hidden"
    />

    <Account2FaTotpActivateForm>
      <AccountAuthSettingsNavigation />
    </Account2FaTotpActivateForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ενεργοποίηση εφαρμογής ελέγχου ταυτότητας (TOTP)
</i18n>
