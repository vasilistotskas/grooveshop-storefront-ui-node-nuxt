<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForLogin', 'loginUsingWebAuthn'])

const { t } = useI18n()

const { loading, login: onSubmit } = usePasskeyLogin({
  title: () => t('webauthn.error.title'),
  fallback: () => t('webauthn.error.description'),
  onSettled: () => {
    emit('getWebAuthnRequestOptionsForLogin')
    emit('loginUsingWebAuthn')
  },
})
</script>

<template>
  <!-- A passkey or a security key: the browser offers whichever the
       shopper has. `type="button"`: it sits beside the sign-in form,
       and must never submit it. -->
  <UButton
    icon="i-lucide-key-round"
    :label="t('webauthn.login')"
    :loading="loading"
    color="neutral"
    variant="outline"
    size="lg"
    block
    type="button"
    @click="onSubmit"
  />
</template>

<i18n lang="yaml">
el:
  webauthn:
    login: Σύνδεση με passkey
    error:
      title: Η σύνδεση απέτυχε
      description: Η συσκευή σου δεν επιβεβαίωσε τη σύνδεση. Δοκίμασε ξανά.
en:
  webauthn:
    login: Sign in with a passkey
    error:
      title: Sign-in failed
      description: Your device did not confirm the sign-in. Try again.
</i18n>
