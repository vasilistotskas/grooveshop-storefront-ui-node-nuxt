<script lang="ts" setup>
import * as z from 'zod'

/**
 * Change the password, or set one on an account that signs in without
 * (social sign-in, a passkey, a code): the current password is asked
 * only when there is one. The strength meter is the sign-up form's, and
 * advisory only — the schema mirrors what Django enforces where a pure
 * function can (8+ characters, not all digits); its other refusals
 * arrive as allauth's translated error codes. Done or cancelled, the
 * shopper goes back to the Security page.
 */
const { changePassword } = useAllAuthAccount()
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

const toast = useToast()
const localePath = useLocalePath()
const { t } = useI18n()

const isSubmitting = ref(false)

const state = reactive({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const schema = computed(() => z
  .object({
    current_password: hasCurrentPassword.value
      ? z.string().min(1, t('validation.required'))
      : z.string().optional(),
    new_password: z.string()
      .min(8, t('validation.min', { min: 8 }))
      .max(255, t('validation.max', { max: 255 }))
      .refine(value => !/^\d+$/.test(value), {
        error: t('validation.password.entirely_numeric'),
      }),
    confirm_password: z.string().min(1, t('validation.required')),
  })
  .superRefine((value, ctx) => {
    if (value.new_password !== value.confirm_password) {
      ctx.addIssue({
        code: 'custom',
        message: t('validation.must_match', { field: t('new'), other: t('confirm') }),
        path: ['confirm_password'],
      })
    }
    if (hasCurrentPassword.value && value.current_password && value.current_password === value.new_password) {
      ctx.addIssue({
        code: 'custom',
        message: t('validation.password.must_not_be_same'),
        path: ['new_password'],
      })
    }
  }))

async function onSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await changePassword({
      current_password: state.current_password,
      new_password: state.new_password,
    })
    toast.add({ title: t('auth.password.change.success'), color: 'success' })
    await navigateTo(localePath('account-security'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    isSubmitting.value = false
  }
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
