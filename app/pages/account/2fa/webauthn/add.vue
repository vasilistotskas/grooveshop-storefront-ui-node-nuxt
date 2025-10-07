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

    <Account2FaWebAuthnAddForm>
      <aside
        class="md:sticky md:top-16"
      >
        <AccountAuthSettingsNavigation />
      </aside>
    </Account2FaWebAuthnAddForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προσθήκη κλειδιού WebAuthn
</i18n>
