<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('title'),
})
</script>

<template>
  <AuthPanel
    icon="i-lucide-key-round"
    :title="t('title')"
    :lead="t('lead')"
  >
    <AccountSignupCreatePasskeyForm />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Δημιούργησε το passkey σου
  lead: Δώσε του ένα όνομα που να λέει ποια συσκευή είναι — μπορείς να προσθέσεις κι άλλα αργότερα.
en:
  title: Create your passkey
  lead: Give it a name that says which device it is — you can add more later.
</i18n>
