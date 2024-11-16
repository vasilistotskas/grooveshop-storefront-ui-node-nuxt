<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

useSeoMeta({
  title: t('title'),
})
useHydratedHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="t('title')" class="text-center" />
    <p
      class="
        text-primary-950

        dark:text-primary-50

        text-center
      "
    >
      {{ t('description') }}
    </p>
    <PageBody>
      <AccountLoginCodeForm />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Στείλε μου έναν κωδικό σύνδεσης
  description: Θα λάβεις ένα email που περιέχει έναν ειδικό κωδικό.
</i18n>
