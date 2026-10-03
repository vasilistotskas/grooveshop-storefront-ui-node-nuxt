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
    <AccountPasswordResetForm />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Επαναφορά κωδικού
  lead: Γράψε το email σου και θα σου στείλουμε σύνδεσμο για να διαλέξεις νέο κωδικό.
en:
  title: Reset your password
  lead: Enter your email and we will send a link to choose a new one.
</i18n>
