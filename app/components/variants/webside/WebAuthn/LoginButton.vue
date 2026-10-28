<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForLogin', 'loginUsingWebAuthn'])

const { t } = useStoreI18n('components/variants/webside/WebAuthn/LoginButton')

const { loading, login: onSubmit } = usePasskeyLogin({
  title: () => t('webauthn.error.title'),
  fallback: () => t('webauthn.error.description'),
  onSettled: () => {
    emit('getWebAuthnRequestOptionsForLogin')
    emit('loginUsingWebAuthn')
  },
})

const submitButtonDisabled = computed(() => {
  return loading.value
})

const submitButtonLabel = computed(() => {
  return !loading.value
    ? t('webauthn.login')
    : t('loading')
})
</script>

<template>
  <UButton
    icon="i-heroicons-solid:lock-closed"
    :aria-busy="loading"
    :disabled="submitButtonDisabled"
    :label="
      submitButtonLabel"
    :loading="loading"
    block
    size="lg"
    type="submit"
    variant="solid"
    color="secondary"
    @click="onSubmit"
  />
</template>

<i18n lang="yaml">
el:
  webauthn:
    login: Σύνδεση με κλειδί ασφαλείας
    error:
      title: Η σύνδεση απέτυχε
      description: Υπήρξε πρόβλημα με την αυθεντικοποίηση μέσω WebAuthn. Παρακαλώ προσπάθησε ξανά.
</i18n>
