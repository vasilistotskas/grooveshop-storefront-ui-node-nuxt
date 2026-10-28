<script lang="ts" setup>
const { t } = useStoreI18n('components/Storefront/Auth/TwoFactorReauthenticateRecoveryCodes')

useHead({ title: () => t('title') })

await useAuthEventGuard(AuthChangeEvent.REAUTHENTICATION_REQUIRED)

const recoveryCode = ref('')

const { submitting, submit } = useCodeReauthentication(() => ({
  title: t('success'),
  color: 'success',
  icon: 'i-lucide-circle-check',
}))

// Recovery codes are 8 digits (allauth MFA_RECOVERY_CODE_DIGITS default).
async function onSubmit() {
  const code = recoveryCode.value.trim()
  if (code.length < 8) return
  if (!await submit(code)) recoveryCode.value = ''
}
</script>

<template>
  <AuthPanel
    icon="i-lucide-shield-check"
    :title="t('title')"
    :lead="t('lead')"
  >
    <Account2FaReauthenticateFlow>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('code')"
          name="code"
          required
        >
          <UInput
            v-model="recoveryCode"
            icon="i-lucide-life-buoy"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="8"
            class="w-full"
          />
        </UFormField>
        <UButton
          :label="t('submit')"
          :loading="submitting"
          :disabled="recoveryCode.trim().length < 8"
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
  lead: Πας να αλλάξεις μια ρύθμιση ασφαλείας. Γράψε έναν από τους κωδικούς ανάκτησης — κάθε κωδικός δουλεύει μία φορά.
  code: Κωδικός ανάκτησης
  submit: Επιβεβαίωση
  success: Επιβεβαιώθηκε
en:
  title: Confirm it is you
  lead: You are about to change a security setting. Enter one of your recovery codes — each works once.
  code: Recovery code
  submit: Confirm
  success: Confirmed
</i18n>
