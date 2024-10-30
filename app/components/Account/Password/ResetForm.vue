<script lang="ts" setup>
import * as z from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { PasswordRequestBody } from '~/types/all-auth'
import type DynamicForm from '~/components/DynamicForm/index.vue'

const emit = defineEmits(['passwordRequest'])

const { passwordRequest } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n({ useScope: 'local' })

const loading = ref(false)
const form = ref<InstanceType<typeof DynamicForm> | null>(null)

async function onSubmit(values: PasswordRequestBody) {
  try {
    loading.value = true
    await passwordRequest({
      email: values.email,
    })
    toast.add({
      title: t('password.reset.request.success'),
      color: 'green',
    })
    emit('passwordRequest')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    finalizeReset()
  }
}

function finalizeReset() {
  loading.value = false
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      name: 'email',
      as: 'input',
      rules: z.string({ required_error: t('validation.required') }).email(t('validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: t('email.title'),
      type: 'email',
    },
  ],
}
</script>

<template>
  <section class="grid">
    <DynamicForm
      ref="form"
      :button-label="t('reset')"
      :loading="loading"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
