<script lang="ts" setup>
const { t } = useStoreI18n('components/Storefront/Auth/LoginCode')

useSeoMeta({
  title: t('title'),
})
</script>

<template>
  <AuthPanel
    :title="t('title')"
    :lead="t('lead')"
  >
    <AccountLoginCodeForm />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Σύνδεση με κωδικό
  lead: Θα σου στείλουμε στο email έναν κωδικό 6 ψηφίων. Δεν χρειάζεσαι κωδικό πρόσβασης.
en:
  title: Sign in with a code
  lead: We will email you a 6-digit code. No password needed.
</i18n>
