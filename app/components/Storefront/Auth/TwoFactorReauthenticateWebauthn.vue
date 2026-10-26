<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForReauthentication', 'reauthenticateUsingWebAuthn'])

const { t } = useI18n()

useHead({ title: () => t('title') })

await useAuthEventGuard(AuthChangeEvent.REAUTHENTICATION_REQUIRED)

/** Started by the shopper's click: Safari refuses WebAuthn without a user gesture. */
const { loading, failed, submit: onSubmit } = useWebAuthnChallenge('reauthenticate', {
  success: () => ({ title: t('success'), color: 'success', icon: 'i-lucide-circle-check' }),
  onDone: () => {
    emit('getWebAuthnRequestOptionsForReauthentication')
    emit('reauthenticateUsingWebAuthn')
  },
})
</script>

<template>
  <AuthPanel
    icon="i-lucide-shield-check"
    :title="t('title')"
    :lead="t('lead')"
  >
    <Account2FaReauthenticateFlow>
      <div
        v-if="loading"
        class="flex items-center gap-3 rounded-[1.125rem] border border-default bg-default p-4"
        role="status"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin text-muted"
        />
        <strong class="text-sm text-highlighted">{{ t('waiting') }}</strong>
      </div>
      <UAlert
        v-else-if="failed"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="t('error.title')"
        :description="t('error.description')"
      />
      <UButton
        :label="failed ? t('retry') : t('start')"
        :loading="loading"
        icon="i-lucide-key-round"
        size="lg"
        block
        @click="onSubmit"
      />
    </Account2FaReauthenticateFlow>
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωσε ότι είσαι εσύ
  lead: Πας να αλλάξεις μια ρύθμιση ασφαλείας. Επιβεβαίωσε με το passkey ή το κλειδί ασφαλείας σου.
  start: Επιβεβαίωση με passkey
  retry: Δοκίμασε ξανά
  waiting: Περιμένουμε τη συσκευή σου…
  success: Επιβεβαιώθηκε
  error:
    title: Η επιβεβαίωση δεν ολοκληρώθηκε
    description: Η συσκευή σου δεν επιβεβαίωσε. Δοκίμασε ξανά ή διάλεξε άλλο τρόπο.
en:
  title: Confirm it is you
  lead: You are about to change a security setting. Confirm with your passkey or security key.
  start: Confirm with a passkey
  retry: Try again
  waiting: Waiting for your device…
  success: Confirmed
  error:
    title: Confirmation did not finish
    description: Your device did not confirm. Try again or pick another way.
</i18n>
