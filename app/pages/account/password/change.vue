<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4

      md:gap-8
    "
  >
    <PageTitle
      :text="hasCurrentPassword ? t('change.title') : t('set.title')"
      class="hidden"
    />

    <AccountPasswordChangeForm>
      <AccountAuthSettingsNavigation />
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
