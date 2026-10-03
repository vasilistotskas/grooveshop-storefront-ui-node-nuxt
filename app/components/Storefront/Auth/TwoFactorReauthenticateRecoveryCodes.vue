<script lang="ts" setup>
const { twoFaReauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

useHead({ title: () => t('title') })

const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

const recoveryCode = ref('')
const submitting = ref(false)

if (authEvent.value !== undefined && authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

// Recovery codes are 8 digits (allauth MFA_RECOVERY_CODE_DIGITS default).
async function onSubmit() {
  const code = recoveryCode.value.trim()
  if (code.length < 8 || submitting.value) return
  submitting.value = true
  try {
    await twoFaReauthenticate({ code })
    toast.add({
      title: t('success'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }
  catch (error) {
    handleAllAuthClientError(error)
    recoveryCode.value = ''
  }
  finally {
    submitting.value = false
  }
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
