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

    <AccountSettingsForm>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </AccountSettingsForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ρυθμίσεις
</i18n>
