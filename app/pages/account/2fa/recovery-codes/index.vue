<script lang="ts" setup>
const { t } = useI18n()

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
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
</i18n>
