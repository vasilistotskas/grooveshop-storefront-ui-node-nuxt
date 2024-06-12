<script lang="ts" setup>
import { z } from 'zod'
import type { DynamicFormSchema } from '~/types/form'
import type { PasswordChangeBody } from '~/types/all-auth'

const { changePassword } = useAllAuthAccount()
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

const { t } = useI18n()
const toast = useToast()

const onSubmit = async (values: PasswordChangeBody) => {
  const body = {
    current_password: values.current_password || '',
    new_password: values.new_password,
  }
  await changePassword(body)
    .then(async () => {
      toast.add({
        title: t('common.auth.password.change.success'),
        color: 'green',
      })
      await navigateTo('/account')
    })
    .catch((error) => {
      toast.add({
        title: error.message || t('common.error.default'),
        color: 'red',
      })
    })
}

const formSchema = computed((): DynamicFormSchema => {
  const fields = [
    {
      label: t('common.password.new'),
      name: 'new_password',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(8).max(255),
      autocomplete: 'new-password',
      readonly: false,
      required: true,
      placeholder: t('common.password.new'),
      type: 'password',
    },
    {
      label: t('common.password.confirm'),
      name: 'confirm_password',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(8).max(255),
      autocomplete: 'new-password',
      readonly: false,
      required: true,
      placeholder: t('common.password.confirm'),
      type: 'password',
    },
  ] as DynamicFormSchema['fields']

  if (hasCurrentPassword.value) {
    fields?.unshift({
      label: t('common.password.current'),
      name: 'current_password',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(8).max(255),
      autocomplete: 'current-password',
      readonly: false,
      required: true,
      placeholder: t('common.password.current'),
      type: 'password',
    })
  }

  return {
    fields,
    extraValidation: z
      .object({
        current_password: z.string({ required_error: t('common.validation.required') }).optional(),
        new_password: z.string({ required_error: t('common.validation.required') }),
        confirm_password: z.string({ required_error: t('common.validation.required') }),
      }).superRefine((val, ctx) => {
        if (val.new_password !== val.confirm_password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              'common.validation.must_match', { field: t('common.password.new'), other: t('common.password.confirm') },
            ),
            path: ['confirm_password'],
          })
        }

        if (hasCurrentPassword.value && val.current_password === val.new_password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              'common.validation.password.must_not_be_same',
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
      container-2xs p-0

      md:px-6
    "
  >
    <section class="grid items-center">
      <DynamicForm
        :button-label="hasCurrentPassword ? t('common.change.title') : t('common.set.title')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
