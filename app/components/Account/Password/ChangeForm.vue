<script lang="ts" setup>
/**
 * Change the password, or set one on an account that signs in without
 * (social sign-in, a passkey, a code): the current password is asked
 * only when there is one. The strength meter is the sign-up form's, and
 * advisory only. Done or cancelled, the shopper goes back to the
 * Security page.
 */
const localePath = useLocalePath()
const { t } = useStoreI18n('components/Account/Password/ChangeForm')

const { state, schema, hasCurrentPassword, isSubmitting, submit } = usePasswordChange({
  fieldLabels: () => ({ field: t('new'), other: t('confirm') }),
})

async function onSubmit() {
  if (await submit()) await navigateTo(localePath('account-security'))
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="flex max-w-md flex-col gap-4"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <UFormField
      v-if="hasCurrentPassword"
      :label="t('current')"
      name="current_password"
      required
    >
      <FormPasswordInput
        v-model="state.current_password"
        autocomplete="current-password"
      />
    </UFormField>

    <UFormField
      :label="t('new')"
      name="new_password"
      required
    >
      <FormPasswordInput
        v-model="state.new_password"
        autocomplete="new-password"
      />
      <FormPasswordStrengthMeter :password="state.new_password" />
    </UFormField>

    <UFormField
      :label="t('confirm')"
      name="confirm_password"
      required
    >
      <FormPasswordInput
        v-model="state.confirm_password"
        autocomplete="new-password"
      />
    </UFormField>

    <div class="flex flex-wrap items-center gap-2 pt-2">
      <UButton
        :label="hasCurrentPassword ? t('submit.change') : t('submit.set')"
        :loading="isSubmitting"
        type="submit"
        color="neutral"
      />
      <UButton
        :label="t('cancel')"
        :to="localePath('account-security')"
        color="neutral"
        variant="ghost"
      />
    </div>
  </UForm>
</template>

<i18n lang="yaml">
el:
  current: Τρέχων κωδικός
  new: Νέος κωδικός
  confirm: Επιβεβαίωση νέου κωδικού
  submit:
    change: Αλλαγή κωδικού
    set: Ορισμός κωδικού
  cancel: Άκυρο
en:
  current: Current password
  new: New password
  confirm: Confirm the new password
  submit:
    change: Change password
    set: Set password
  cancel: Cancel
</i18n>
