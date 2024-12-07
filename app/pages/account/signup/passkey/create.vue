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
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="t('title')" class="text-center" />
    <p
      class="
        text-primary-950 flex items-center text-center

        dark:text-primary-50
      "
    >
      {{ t('description') }}
    </p>

    <AccountSignupCreatePasskeyForm />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Δημιουργία κωδικού μιας χρήσης
  description: Πρόκειται να δημιουργήσεις έναν κωδικό μιας χρήσης για το λογαριασμό σου. Καθώς μπορείς να προσθέσεις επιπλέον κλειδιά αργότερα, μπορείς να χρησιμοποιήσεις ένα περιγραφικό όνομα για να διακρίνεις τα κλειδιά μεταξύ τους.
</i18n>
