<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { PasswordRequestBody } from '~/types/all-auth'

const emit = defineEmits(['passwordRequest'])

const { passwordRequest } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

async function onSubmit(values: PasswordRequestBody) {
  try {
    loading.value = true
    await passwordRequest({
      email: values.email,
    })
    toast.add({
      title: t('common.password.reset.request.success'),
      color: 'green',
    })
    emit('passwordRequest')
  }
  catch (error) {
    handleResetError()
  }
  finally {
    finalizeReset()
  }
}

function handleResetError() {
  toast.add({
    title: t('common.error.default'),
    color: 'red',
  })
}

function finalizeReset() {
  loading.value = false
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('pages.account.password.reset.form.email.label'),
      name: 'email',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
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
      :button-label="t('common.reset')"
      :loading="loading"
      :schema="formSchema"
      class="
        container-2xs bg-primary-100 grid h-full items-center justify-center
        rounded-[0.5rem] !p-4 shadow-[0_4px_9px_-4px_#0000000d]

        dark:bg-primary-900 dark:shadow-[0_4px_9px_-4px_#0000000d]

        md:p-8 md:px-6
      "
      @submit="onSubmit"
    />
  </section>
</template>
