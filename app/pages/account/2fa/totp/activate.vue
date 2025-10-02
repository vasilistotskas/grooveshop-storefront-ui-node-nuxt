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

    <Account2FaTotpActivateForm>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </Account2FaTotpActivateForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ενεργοποίηση εφαρμογής ελέγχου ταυτότητας (TOTP)
</i18n>
