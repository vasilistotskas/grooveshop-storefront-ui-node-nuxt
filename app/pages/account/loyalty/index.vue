<script lang="ts" setup>
const { t } = useI18n()

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
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
