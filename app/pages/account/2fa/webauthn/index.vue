<script lang="ts" setup>
const { t } = useI18n()
const { setupAuthenticators } = useAuthStore()

// Populate authenticators before the list renders. Without this the store is
// only hydrated client-side after idle, so WebAuthnList's setup snapshot is
// empty and its watchEffect redirects every direct visit / hard refresh away.
await setupAuthenticators()

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

    <Account2FaWebAuthnList>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </Account2FaWebAuthnList>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κλειδιά ασφαλείας
</i18n>
