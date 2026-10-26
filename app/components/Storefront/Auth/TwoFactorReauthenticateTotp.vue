<script lang="ts" setup>
const { t } = useI18n()

useHead({ title: () => t('title') })

await useAuthEventGuard(AuthChangeEvent.REAUTHENTICATION_REQUIRED)

const code = ref<string[]>([])

const { submitting, submit } = useCodeReauthentication(() => ({
  title: t('success'),
  color: 'success',
  icon: 'i-lucide-circle-check',
}))

async function onSubmit() {
  const codeValue = code.value.join('')
  if (codeValue.length !== 6) return
  if (!await submit(codeValue)) code.value = []
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
        class="flex flex-col gap-6"
        @submit.prevent="onSubmit"
      >
        <UPinInput
          v-model="code"
          :length="6"
          type="text"
          otp
          size="xl"
          :aria-label="t('code')"
          @complete="onSubmit"
        />
        <UButton
          :label="t('submit')"
          :loading="submitting"
          :disabled="code.join('').length !== 6"
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
  lead: Πας να αλλάξεις μια ρύθμιση ασφαλείας. Γράψε τον 6ψήφιο κωδικό από την εφαρμογή επαλήθευσης.
  code: Κωδικός 6 ψηφίων
  submit: Επιβεβαίωση
  success: Επιβεβαιώθηκε
en:
  title: Confirm it is you
  lead: You are about to change a security setting. Enter the 6-digit code from your authenticator app.
  code: 6-digit code
  submit: Confirm
  success: Confirmed
</i18n>
