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
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')" class="text-center capitalize"
    />
    <p
      class="
        text-primary-950 text-center

        dark:text-primary-50
      "
    >
      {{ t('description') }}
    </p>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση Email
  description: Θα πρέπει να επιβεβαιώσεις το email σου πριν συνεχίσεις.
</i18n>
