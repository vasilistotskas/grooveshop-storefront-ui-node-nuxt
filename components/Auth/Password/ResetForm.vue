<script lang="ts" setup>
import { z } from 'zod'

import type { PasswordResetBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { passwordReset } = useAuth()

const { t } = useI18n()
async function onSubmit(values: PasswordResetBody) {
  await passwordReset({
    email: values.email,
  })
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('pages.auth.password.reset.form.email.label'),
      name: 'email',
      as: 'input',
      rules: z.string().email(),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: '',
      type: 'email',
    },
  ],
}
</script>

<template>
  <section class="grid">
    <DynamicForm
      class="container-xxs grid h-full items-center justify-center rounded-[0.5rem] border border-gray-900/10 bg-white p-4 shadow-[0_4px_9px_-4px_#0000000d] dark:border-gray-50/[0.2] dark:bg-zinc-800 dark:shadow-[0_4px_9px_-4px_#0000000d] md:p-8 md:px-6"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
