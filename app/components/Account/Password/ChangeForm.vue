<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['changePassword'])

const { changePassword } = useAllAuthAccount()
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const onSubmit = async (values: PasswordChangeBody) => {
  const body = {
    current_password: values.current_password || '',
    new_password: values.new_password,
  }
  try {
    await changePassword(body)
    toast.add({
      title: $i18n.t('auth.password.change.success'),
      color: 'success',
    })
    emit('changePassword')
    await navigateTo(localePath('account'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema = computed<DynamicFormSchema>(() => {
  // Create a reusable password schema with proper error handling
  const createPasswordSchema = (fieldType: 'current' | 'new' | 'confirm') => {
    return z.string({
      error: (issue) => {
        if (issue.input === undefined || issue.input === '') {
          return $i18n.t('validation.required')
        }
        if (typeof issue.input !== 'string') {
          return $i18n.t('validation.string.invalid')
        }
        return $i18n.t('validation.string.invalid')
      },
    })
      .min(8, {
        error: issue => $i18n.t('validation.min', { min: issue.minimum }),
      })
      .max(255, {
        error: issue => $i18n.t('validation.max', { max: issue.maximum }),
      })
  }

  const fields = [
    {
      label: $i18n.t('password.new'),
      name: 'new_password',
      as: 'input',
      rules: createPasswordSchema('new'),
      autocomplete: 'new-password',
      readonly: false,
      required: true,
      placeholder: $i18n.t('password.new'),
      type: 'password',
    },
    {
      label: $i18n.t('password.confirm'),
      name: 'confirm_password',
      as: 'input',
      rules: createPasswordSchema('confirm'),
      autocomplete: 'new-password',
      readonly: false,
      required: true,
      placeholder: $i18n.t('password.confirm'),
      type: 'password',
    },
  ] as DynamicFormSchema['fields']

  if (hasCurrentPassword.value) {
    fields?.unshift({
      label: $i18n.t('password.current'),
      name: 'current_password',
      as: 'input',
      rules: createPasswordSchema('current'),
      autocomplete: 'current-password',
      condition: null,
      disabledCondition: null,
      readonly: false,
      required: true,
      placeholder: $i18n.t('password.current'),
      type: 'password',
    })
  }

  return {
    fields,
    extraValidation: z
      .object({
        current_password: hasCurrentPassword.value
          ? createPasswordSchema('current')
          : z.string().optional(),
        new_password: createPasswordSchema('new'),
        confirm_password: createPasswordSchema('confirm'),
      })
      .superRefine((val, ctx) => {
        // Check if passwords match
        if (val.new_password !== val.confirm_password) {
          ctx.addIssue({
            code: 'custom',
            message: $i18n.t(
              'validation.must_match',
              { field: $i18n.t('password.new'), other: $i18n.t('password.confirm') },
            ),
            path: ['confirm_password'],
          })
        }

        // Check if current password is different from new password
        if (hasCurrentPassword.value && val.current_password && val.current_password === val.new_password) {
          ctx.addIssue({
            code: 'custom',
            message: $i18n.t('validation.password.must_not_be_same'),
            path: ['new_password'], // Better to put this error on new_password field
          })
        }
      }),
  }
})
</script>

<template>
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />
    <section class="grid w-full items-center gap-4">
      <p
        class="
          text-center text-primary-950
          dark:text-primary-50
        "
      >
        {{ hasCurrentPassword ? t('change.description') : t('set.description')
        }}
      </p>
      <DynamicForm
        :button-label="hasCurrentPassword ? t('change.title') : t('set.title')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>

<i18n lang="yaml">
el:
  change:
    title: Αλλαγή κωδικού πρόσβασης
    description: Εισήγαγε τον τρέχον κωδικό πρόσβασης, ακολουθούμενο από τον νέο
      κωδικό πρόσβασης.
  set:
    title: Όρισε έναν κωδικό πρόσβασης
    description: Αυτή τη στιγμή δεν έχεις καθορίσει κωδικό πρόσβασης. Εισήγαγε
      τον (νέο) κωδικό πρόσβασης.
</i18n>
