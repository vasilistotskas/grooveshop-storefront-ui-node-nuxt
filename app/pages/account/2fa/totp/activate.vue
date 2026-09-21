<script lang="ts" setup>
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })

defineRouteRules({
  robots: false,
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:gap-8 md:p-0!
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
