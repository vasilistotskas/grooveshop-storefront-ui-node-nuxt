<script lang="ts" setup>
const { t } = useI18n()

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      mx-auto flex max-w-(--container-4xl) flex-col gap-4
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
  title: Επανέφερε τον κωδικό πρόσβασης
</i18n>
