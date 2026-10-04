<script lang="ts" setup>
/**
 * Replace the recovery codes with a new set
 * (`Account/2Fa/RecoveryCodes/Generate`).
 */
const { t } = useI18n()
useHead({ title: () => t('title') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />
    <div class="rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6">
      <Account2FaRecoveryCodesGenerate />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Νέοι κωδικοί ανάκτησης
  lead: Ένα νέο σετ ακυρώνει όσους κωδικούς σου απομένουν.
en:
  title: New recovery codes
  lead: A new set cancels whatever codes you have left.
</i18n>
