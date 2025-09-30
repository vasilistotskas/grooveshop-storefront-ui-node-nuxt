<script lang="ts" setup>
const { t } = useI18n()

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

    <Account2FaRecoveryCodesGenerate>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </Account2FaRecoveryCodesGenerate>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Δημιουργία Κωδικών Ανάκτησης
</i18n>
