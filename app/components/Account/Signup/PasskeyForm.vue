<script lang="ts" setup>
const emit = defineEmits(['signUpByPasskey'])

const { t } = useI18n()
const localePath = useLocalePath()

const { schema, state, loading, hasError, onSubmit } = useSignUpByPasskey({
  onSignedUp: () => emit('signUpByPasskey'),
})
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="flex flex-col gap-4"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <UFormField
      :label="t('email.title')"
      name="email"
      required
    >
      <UInput
        v-model="state.email"
        type="email"
        autocomplete="email webauthn"
        inputmode="email"
        icon="i-lucide-mail"
        class="w-full"
      />
    </UFormField>

    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('error.title')"
      :description="t('error.description')"
    />

    <UButton
      :label="t('submit')"
      :loading="loading"
      icon="i-lucide-key-round"
      size="lg"
      block
      type="submit"
    />

    <p class="text-center text-sm text-muted">
      {{ t('prefer_password') }}
      <ULink
        :to="localePath('account-signup')"
        class="font-semibold text-accent"
      >
        {{ t('using_password') }}
      </ULink>
    </p>
  </UForm>
</template>

<i18n lang="yaml">
el:
  email:
    title: Email
  submit: Δημιουργία passkey
  error:
    title: Η εγγραφή δεν ολοκληρώθηκε
    description: Δεν μπορέσαμε να ξεκινήσουμε την εγγραφή με passkey. Δοκίμασε ξανά.
  prefer_password: Προτιμάς κωδικό;
  using_password: Εγγραφή με email
en:
  email:
    title: Email
  submit: Create passkey
  error:
    title: Sign-up did not go through
    description: We could not start the passkey sign-up. Try again.
  prefer_password: Prefer a password?
  using_password: Sign up with email
</i18n>
