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
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />
    <PageBody>
      <AccountSignupForm />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Εγγραφή
</i18n>
