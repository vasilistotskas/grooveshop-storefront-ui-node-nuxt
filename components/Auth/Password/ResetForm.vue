<script lang="ts" setup>
import { z } from 'zod'

import type { PasswordResetBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const emit = defineEmits(['passwordReset'])

const { passwordReset } = useAuth()
const toast = useToast()

const loading = ref(false)

const { t } = useI18n()

async function onSubmit(values: PasswordResetBody) {
  try {
    loading.value = true
    const data = await passwordReset({
      email: values.email,
    })
    toast.add({
      title: data?.detail || t('common.success'),
      color: 'green',
    })
    emit('passwordReset')
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
    title: t('common.error'),
    color: 'red',
  })
}

function finalizeReset() {
  loading.value = false
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('pages.auth.password.reset.form.email.label'),
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
      class="
        container-2xs bg-primary-100 grid h-full items-center justify-center
        rounded-[0.5rem] !p-4 shadow-[0_4px_9px_-4px_#0000000d]

        dark:bg-primary-900 dark:shadow-[0_4px_9px_-4px_#0000000d]

        md:p-8 md:px-6
      "
      :schema="formSchema"
      :button-label="t('common.reset')"
      :loading="loading"
      @submit="onSubmit"
    />
  </section>
</template>
