<script lang="ts" setup>
const { t } = useStoreI18n('components/Storefront/Auth/ReauthenticateByCode')

useHead({ title: () => t('title') })

await useAuthEventGuard(AuthChangeEvent.REAUTHENTICATION_REQUIRED)

const { maskedAddress, sending, requestCode } = useEmailCodeReauthentication()

function onSubmit() {
  return requestCode(() => ({
    title: t('sent'),
    color: 'success',
    icon: 'i-lucide-circle-check',
  }))
}
</script>

<template>
  <AuthPanel
    icon="i-lucide-mail"
    :title="t('title')"
    :lead="t('lead', { address: maskedAddress })"
  >
    <Account2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE_BY_CODE">
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UButton
          :label="t('submit')"
          :loading="sending"
          size="lg"
          block
          type="submit"
        />
      </form>
    </Account2FaReauthenticateFlow>
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωσε ότι είσαι εσύ
  lead: Πας να αλλάξεις μια ρύθμιση ασφαλείας. Θα στείλουμε έναν κωδικό 6 ψηφίων στο {address}.
  submit: Στείλε μου κωδικό
  sent: Σου στείλαμε κωδικό
en:
  title: Confirm it is you
  lead: You are about to change a security setting. We will email a 6-digit code to {address}.
  submit: Send me a code
  sent: We sent you a code
</i18n>
