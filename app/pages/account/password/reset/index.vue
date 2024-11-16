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
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />
    <PageBody>
      <p
        class="
          text-primary-950

          dark:text-primary-50

          text-center
        "
      >
        {{ t('description') }}
      </p>
      <AccountPasswordResetForm />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επαναφορά κωδικού πρόσβασης
  description: |-
    Εισήγαγε την επαληθευμένη διεύθυνση email του λογαριασμού χρήστη σου
      για να λάβεις έναν σύνδεσμο επαναφοράς κωδικού πρόσβασης.
</i18n>
