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

definePageMeta({
  middleware: ['loyalty-enabled'],
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />

    <div class="grid gap-6">
      <!-- Loyalty Summary Card -->
      <LoyaltySummary />

      <!-- Tier System Information -->
      <LoyaltyTierSystem />

      <!-- Transaction History -->
      <LoyaltyTransactions />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Πρόγραμμα Επιβράβευσης
</i18n>
