<script lang="ts" setup>
const emit = defineEmits(['requestLoginCode'])

const { t } = useStoreI18n('components/Account/Login/Code/Form')
const localePath = useLocalePath()

const { schema, state, loading, hasError, onSubmit } = useLoginCodeRequest({
  sent: () => ({
    title: t('success.title'),
    description: t('success.description'),
    color: 'success',
    icon: 'i-heroicons-check-circle',
  }),
  onRequested: () => emit('requestLoginCode'),
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
        autocomplete="email"
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
      size="lg"
      block
      type="submit"
    />

    <p class="text-center text-sm text-muted">
      {{ t('footer.text') }}
      <ULink
        :to="localePath('account-login')"
        class="font-semibold text-accent"
      >
        {{ t('footer.link') }}
      </ULink>
    </p>
  </UForm>
</template>

<i18n lang="yaml">
el:
  email:
    title: Email
  submit: Αποστολή κωδικού
  success:
    title: Το Email στάλθηκε
    description: Έλεγξε το email σου για τον κωδικό σύνδεσης.
  error:
    title: Σφάλμα αποστολής
    description: Δεν ήταν δυνατή η αποστολή του κωδικού.
  footer:
    text: Τον θυμήθηκες;
    link: Σύνδεση με κωδικό πρόσβασης
en:
  email:
    title: Email
  submit: Send code
  success:
    title: Email sent
    description: Check your email for the sign-in code.
  error:
    title: The email could not be sent
    description: We could not send the code.
  footer:
    text: Remembered it?
    link: Sign in with password
</i18n>
