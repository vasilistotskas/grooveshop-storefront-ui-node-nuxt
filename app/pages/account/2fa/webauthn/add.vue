<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="hidden"
    />

    <Account2FaWebAuthnAddForm>
      <AccountAuthSettingsNavigation />
    </Account2FaWebAuthnAddForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προσθήκη κλειδιού WebAuthn
</i18n>
