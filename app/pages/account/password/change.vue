<script lang="ts" setup>
const { t } = useI18n()
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

// This page's title is CONDITIONAL — change it, or set one for the
// first time — so it has no flat `title` key and the sweep that gave
// every other account route its document title skipped it.
useHead({
  title: () => (hasCurrentPassword.value ? t('change.title') : t('set.title')),
})

defineRouteRules({
  robots: false,
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
en:
  change:
    title: Change password
  set:
    title: Set a password
</i18n>
