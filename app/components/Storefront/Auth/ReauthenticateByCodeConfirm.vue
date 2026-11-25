<script lang="ts" setup>
const { t } = useStoreI18n('components/Storefront/Auth/ReauthenticateByCodeConfirm')

useHead({ title: () => t('title') })

await useAuthEventGuard(AuthChangeEvent.REAUTHENTICATION_REQUIRED)

const { maskedAddress, submitting, hasError, confirm, resend } = useEmailCodeReauthentication()

const code = ref<string[]>([])

async function onSubmit() {
  const codeValue = code.value.join('')
  if (codeValue.length !== 6) return
  const confirmed = await confirm(
    codeValue,
    () => ({ title: t('success'), color: 'success', icon: 'i-lucide-circle-check' }),
    () => ({ title: t('start_over'), color: 'warning' }),
  )
  if (!confirmed) code.value = []
}
</script>

<template>
  <!-- 5 minutes: Django's ACCOUNT_LOGIN_BY_CODE_TIMEOUT is 300 s. -->
  <AuthPanel
    icon="i-lucide-mail-check"
    :title="t('title')"
    :lead="t('lead', { address: maskedAddress })"
  >
    <Account2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE_BY_CODE">
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
        <UAlert
          v-if="hasError"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :title="t('error.title')"
          :description="t('error.description')"
          close
          @update:open="hasError = false"
        />
        <UButton
          :label="t('submit')"
          :loading="submitting"
          :disabled="code.join('').length !== 6"
          size="lg"
          block
          type="submit"
        />
        <AuthResendCode
          :send="resend"
          start-over="account-reauthenticate-code"
        />
      </form>
    </Account2FaReauthenticateFlow>
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Δες το email σου
  lead: Γράψε τον κωδικό που στείλαμε στο {address}. Λήγει σε 5 λεπτά.
  code: Κωδικός 6 ψηφίων
  submit: Επιβεβαίωση
  success: Επιβεβαιώθηκε
  start_over: Ο κωδικός έληξε. Ζήτα νέο.
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός δεν είναι σωστός ή έχει λήξει.
en:
  title: Check your inbox
  lead: Enter the code we sent to {address}. It expires in 5 minutes.
  code: 6-digit code
  submit: Confirm
  success: Confirmed
  start_over: The code has expired. Ask for a new one.
  error:
    title: That code is not valid
    description: The code you entered is not valid, or it has expired.
</i18n>
