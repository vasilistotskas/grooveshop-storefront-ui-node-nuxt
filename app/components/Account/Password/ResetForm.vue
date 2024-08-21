<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import DynamicForm from '~/components/DynamicForm/index.vue'
import type { PasswordRequestBody } from '~/types/all-auth'

const emit = defineEmits(['passwordRequest'])

const { passwordRequest } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)
const form = ref<InstanceType<typeof DynamicForm> | null>(null)

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
      rules: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: t('common.email.title'),
      type: 'email',
    },
  ],
}
</script>

<template>
  <section class="grid">
    <DynamicForm
      ref="form"
      :button-label="t('common.reset')"
      :loading="loading"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
