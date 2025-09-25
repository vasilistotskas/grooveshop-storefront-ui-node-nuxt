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
      flex flex-col gap-4
      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center"
    />
    <p
      class="
        flex items-center text-center text-primary-950
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
