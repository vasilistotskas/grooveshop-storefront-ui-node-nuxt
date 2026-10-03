<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('title'),
})
</script>

<template>
  <!-- 5 minutes: Django's ACCOUNT_LOGIN_BY_CODE_TIMEOUT is 300 s. -->
  <AuthPanel
    :title="t('title')"
    :lead="t('lead')"
  >
    <AccountLoginCodeConfirmForm />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Δες το email σου
  lead: Γράψε τον κωδικό που σου στείλαμε. Λήγει σε 5 λεπτά.
en:
  title: Check your inbox
  lead: Enter the code we sent you. It expires in 5 minutes.
</i18n>
