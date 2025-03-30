<script lang="ts" setup>
import * as z from 'zod'

import type DynamicForm from '~/components/DynamicForm/index.vue'

const emit = defineEmits(['passwordRequest'])

const { passwordRequest } = useAllAuthAuthentication()
const toast = useToast()
const { $i18n } = useNuxtApp()

const loading = ref(false)
const form = ref<InstanceType<typeof DynamicForm> | null>(null)

async function onSubmit(values: PasswordRequestBody) {
  try {
    loading.value = true
    await passwordRequest({
      email: values.email,
    })
    toast.add({
      title: $i18n.t('password.reset.request.success'),
      color: 'success',
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
      rules: z.string({ required_error: $i18n.t('validation.required') }).email($i18n.t('validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: $i18n.t('email.title'),
      type: 'email',
    },
  ],
}
</script>

<template>
  <section class="grid">
    <DynamicForm
      ref="form"
      :button-label="$i18n.t('reset')"
      :loading="loading"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
