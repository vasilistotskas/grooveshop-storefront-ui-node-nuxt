<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      max-w-(--container-4xl) mx-auto flex flex-col gap-4

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />

    <AccountPasswordResetConfirmForm />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επαναφέρετε τον κωδικό πρόσβασης
</i18n>
