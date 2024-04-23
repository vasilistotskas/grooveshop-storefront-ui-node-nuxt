<script lang="ts" setup>
import { z } from 'zod'

import type { PasswordChangeBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { passwordChange } = useAuth()

const { t } = useI18n()
const toast = useToast()

function onSubmit(values: PasswordChangeBody) {
  passwordChange(values)
    .then(async () => {
      toast.add({
        title: t('components.auth.security.password.change.form.success.title'),
        color: 'green',
      })
      await navigateTo('/account')
    })
    .catch((error) => {
      const newPassword1Error = error.value.data?.data?.newPassword1 as string[]
      const newPassword2Error = error.value.data?.data?.newPassword2 as string[]

      const toastTitle
        = newPassword1Error?.join(' ')
        ?? newPassword2Error?.join(' ')
        ?? error.value?.message
        ?? t('components.auth.security.password.change.form.error.title')

      toast.add({
        title: toastTitle,
        color: 'red',
      })
    })
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t(
        'components.auth.security.password.change.form.newPassword1.label',
      ),
      name: 'newPassword1',
      as: 'input',
      rules: z.string().min(8).max(255),
      autocomplete: 'new-password',
      readonly: false,
      required: true,
      placeholder: t(
        'components.auth.security.password.change.form.newPassword1.placeholder',
      ),
      type: 'password',
    },
    {
      label: t(
        'components.auth.security.password.change.form.newPassword2.label',
      ),
      name: 'newPassword2',
      as: 'input',
      rules: z.string().min(8).max(255),
      autocomplete: 'new-password',
      readonly: false,
      required: true,
      placeholder: t(
        'components.auth.security.password.change.form.newPassword2.placeholder',
      ),
      type: 'password',
    },
  ],
  extraValidation: z
    .object({
      newPassword1: z.string(),
      newPassword2: z.string(),
    })
    .refine(data => data.newPassword1 === data.newPassword2, {
      message: t(
        'components.auth.security.password.change.form.password2.validation.mismatch',
      ),
      path: ['newPassword2'],
    }),
}
</script>

<template>
  <section
    class="
      container-2xs bg-primary-100 rounded !p-4

      dark:bg-primary-900

      md:px-6
    "
  >
    <DynamicForm :schema="formSchema" :button-label="t('common.change.title')" @submit="onSubmit" />
  </section>
</template>
