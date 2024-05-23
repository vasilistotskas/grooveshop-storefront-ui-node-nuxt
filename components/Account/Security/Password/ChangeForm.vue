<script lang="ts" setup>
import { z } from 'zod'
import type { DynamicFormSchema } from '~/types/form'
import type { PasswordChangeBody } from '~/types/all-auth'

const { changePassword } = useAllAuthAccount()

const { t } = useI18n()
const toast = useToast()

function onSubmit(values: PasswordChangeBody) {
  changePassword(values)
    .then(async () => {
      toast.add({
        title: t('components.account.security.password.change.form.success.title'),
        color: 'green',
      })
      await navigateTo('/account')
    })
    .catch((error) => {
      toast.add({
        title: error,
        color: 'red',
      })
    })
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t(
        'components.account.security.password.change.form.current_password.label',
      ),
      name: 'current_password',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(8).max(255),
      autocomplete: 'current-password',
      readonly: false,
      required: true,
      placeholder: t(
        'components.account.security.password.change.form.current_password.placeholder',
      ),
      type: 'password',
    },
    {
      label: t(
        'components.account.security.password.change.form.new_password.label',
      ),
      name: 'new_password',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(8).max(255),
      autocomplete: 'new-password',
      readonly: false,
      required: true,
      placeholder: t(
        'components.account.security.password.change.form.new_password.placeholder',
      ),
      type: 'password',
    },
  ],
  extraValidation: z
    .object({
      current_password: z.string({ required_error: t('common.validation.required') }),
      new_password: z.string({ required_error: t('common.validation.required') }),
    })
    .refine(data => data.current_password !== data.new_password, {
      message: t(
        'components.account.security.password.change.form.error.same_password',
      ),
      path: ['new_password'],
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
    <DynamicForm
      :button-label="t('common.change.title')"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
