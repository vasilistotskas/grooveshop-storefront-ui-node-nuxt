<script lang="ts" setup>
const { t } = useI18n()
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

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
      :text="hasCurrentPassword ? t('change.title') : t('set.title')"
      class="hidden"
    />

    <AccountPasswordChangeForm>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </AccountPasswordChangeForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  change:
    title: Αλλαγή κωδικού πρόσβασης
  set:
    title: Όρισε έναν κωδικό πρόσβασης
</i18n>
