<script lang="ts" setup>
const { t } = useStoreI18n('components/Account/Password/ResetConfirmForm')

const { key, hasError, isSubmitting, newPassword1, newPassword2, schema, onSubmit } = await usePasswordResetConfirm({
  mismatch: () => t('errors.match'),
  successDescription: () => t('success.description'),
  successIcon: 'i-lucide-circle-check',
})
</script>

<template>
  <UForm
    :schema="schema"
    :state="{ newPassword1, newPassword2, key: String(key) }"
    class="flex flex-col gap-4"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
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

    <UFormField
      name="newPassword1"
      :label="t('new_password')"
      required
    >
      <FormPasswordInput
        v-model="newPassword1"
        autocomplete="new-password"
      />
      <FormPasswordStrengthMeter :password="newPassword1" />
    </UFormField>

    <UFormField
      name="newPassword2"
      :label="t('repeat_password')"
      required
    >
      <FormPasswordInput
        v-model="newPassword2"
        autocomplete="new-password"
      />
    </UFormField>

    <UButton
      :label="t('submit')"
      :loading="isSubmitting"
      size="lg"
      block
      type="submit"
    />
  </UForm>
</template>

<i18n lang="yaml">
el:
  new_password: Νέος κωδικός
  repeat_password: Επανάληψη κωδικού
  submit: Αποθήκευση κωδικού
  errors:
    match: Οι δύο κωδικοί πρέπει να είναι ίδιοι
  success:
    description: Συνδέσου με τον νέο σου κωδικό.
  error:
    title: Ο κωδικός δεν άλλαξε
    description: Ο σύνδεσμος μπορεί να έχει λήξει. Ζήτα έναν νέο.
en:
  new_password: New password
  repeat_password: Repeat password
  submit: Save password
  errors:
    match: The two passwords have to match
  success:
    description: Sign in with your new password.
  error:
    title: The password was not changed
    description: The link may have expired. Ask for a new one.
</i18n>
