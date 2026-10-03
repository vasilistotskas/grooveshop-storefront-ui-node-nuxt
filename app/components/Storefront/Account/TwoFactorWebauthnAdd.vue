<script lang="ts" setup>
/**
 * Add a passkey or security key: the browser asks for the face,
 * fingerprint, device PIN or the key itself (`Account/2Fa/WebAuthn/AddForm`).
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
      <Account2FaWebAuthnAddForm />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Νέο passkey ή κλειδί ασφαλείας
  lead: Η συσκευή σου θα ζητήσει το πρόσωπο, το δακτυλικό αποτύπωμα ή το PIN σου, ή να αγγίξεις το κλειδί.
en:
  title: Add a passkey or security key
  lead: Your device will ask for your face, fingerprint or PIN, or for a touch of the key.
</i18n>
