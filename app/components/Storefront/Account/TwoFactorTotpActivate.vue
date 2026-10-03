<script lang="ts" setup>
const { t } = useI18n()
useHead({ title: () => t('title') })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')" />

    <Account2FaTotpActivateForm />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Ενεργοποίηση επαλήθευσης δύο βημάτων
en:
  title: Turn on two-step verification
</i18n>
