<script lang="ts" setup>
/**
 * The shopper's recovery codes (`Account/2Fa/RecoveryCodes`): one each
 * for the times the authenticator app or passkey is not to hand.
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
      <Account2FaRecoveryCodes />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Κωδικοί ανάκτησης
  lead: Χρησιμοποίησε έναν όταν δεν έχεις μαζί τη συσκευή σου.
en:
  title: Recovery codes
  lead: Use one when you do not have your device with you.
</i18n>
