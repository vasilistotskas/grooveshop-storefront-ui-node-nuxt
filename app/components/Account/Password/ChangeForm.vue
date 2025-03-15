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
      color: 'green',
    })
    emit('changePassword')
    await navigateTo(localePath('account'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema = computed((): DynamicFormSchema => {
  const fields = [
    {
      label: $i18n.t('password.new'),
      name: 'new_password',
      as: 'input',
      rules: z.string({ required_error: $i18n.t('validation.required') }).min(8).max(255),
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
      rules: z.string({ required_error: $i18n.t('validation.required') }).min(8).max(255),
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
      rules: z.string({ required_error: $i18n.t('validation.required') }).min(8).max(255),
      autocomplete: 'current-password',
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
        current_password: z.string({ required_error: $i18n.t('validation.required') }).optional(),
        new_password: z.string({ required_error: $i18n.t('validation.required') }),
        confirm_password: z.string({ required_error: $i18n.t('validation.required') }),
      }).superRefine((val, ctx) => {
        if (val.new_password !== val.confirm_password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: $i18n.t(
              'validation.must_match', { field: $i18n.t('password.new'), other: $i18n.t('password.confirm') },
            ),
            path: ['confirm_password'],
          })
        }

        if (hasCurrentPassword.value && val.current_password === val.new_password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: $i18n.t(
              'validation.password.must_not_be_same',
            ),
            path: ['confirm_password'],
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
          text-primary-950 text-center

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
