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
  <PageWrapper class="md:!p-0">
    <PageTitle
      :text="t('title')"
      class="sr-only"
    />

    <Account2FaRecoveryCodes>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </Account2FaRecoveryCodes>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κωδικοί Ανάκτησης
en:
  title: Recovery Codes
</i18n>
