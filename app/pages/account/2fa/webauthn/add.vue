<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

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

    <Account2FaWebAuthnAddForm>
      <AccountAuthSettingsNavigation />
    </Account2FaWebAuthnAddForm>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προσθήκη κλειδιού WebAuthn
</i18n>
