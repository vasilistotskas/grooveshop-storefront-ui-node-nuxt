<script lang="ts" setup>
const emit = defineEmits(['confirmLoginCode'])

const { resendLoginCode } = useAllAuthAuthentication()

const { t } = useStoreI18n('components/Account/Login/Code/ConfirmForm')

const { code, codeString, hasError, schema, onSubmit } = useLoginCodeConfirm({
  welcome: () => ({
    title: t('logged_in'),
    description: t('welcome_back'),
    color: 'success',
    icon: 'i-heroicons-check-circle',
  }),
  onConfirmed: () => emit('confirmLoginCode'),
})
</script>

<template>
  <UForm
    :schema="schema"
    :state="{ code: codeString }"
    class="flex flex-col gap-6"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <UFormField
      name="code"
      :label="t('code_label')"
      :ui="{ label: 'sr-only' }"
    >
      <UPinInput
        v-model="code"
        :length="6"
        type="text"
        otp
        size="xl"
        :aria-label="t('code_label')"
      />
    </UFormField>

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
      :disabled="codeString.length !== 6"
      size="lg"
      block
      type="submit"
    />

    <AuthResendCode
      :send="resendLoginCode"
      start-over="account-login-code"
    />
  </UForm>
</template>

<i18n lang="yaml">
el:
  code_label: Κωδικός 6 ψηφίων
  submit: Σύνδεση
  logged_in: Συνδέθηκες
  welcome_back: Καλώς ήρθες ξανά
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός δεν είναι σωστός ή έχει λήξει.
  validation:
    required: Απαιτείται κωδικός
    code:
      length: Ο κωδικός πρέπει να έχει 6 ψηφία
en:
  code_label: 6-digit code
  submit: Sign in
  logged_in: You are signed in
  welcome_back: Welcome back
  error:
    title: That code is not valid
    description: The code you entered is not valid, or it has expired.
  validation:
    required: A code is required
    code:
      length: The code must be 6 digits
</i18n>
