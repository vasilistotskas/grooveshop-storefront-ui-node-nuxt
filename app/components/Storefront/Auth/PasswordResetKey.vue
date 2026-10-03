<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('title'),
})
</script>

<template>
  <AuthPanel
    :title="t('title')"
    :lead="t('lead')"
  >
    <AccountPasswordResetConfirmForm />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Διάλεξε νέο κωδικό
  lead: Μετά θα συνδεθείς με τον νέο σου κωδικό.
en:
  title: Choose a new password
  lead: You will then sign in with your new password.
</i18n>
