<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { CodeRequestBody } from '~/types/all-auth'

const emit = defineEmits(['requestLoginCode'])

const { requestLoginCode } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

async function onSubmit(values: CodeRequestBody) {
  try {
    loading.value = true
    await requestLoginCode(values)
    emit('requestLoginCode')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      await navigateTo('/account/login/code/confirm')
    }
    else {
      toast.add({
        title: t('common.error.default'),
        color: 'red',
      })
    }
  }
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
  <div
    class="
      container-2xs p-0

      md:px-6
    "
  >
    <section class="grid items-center">
      <DynamicForm
        :button-label="t('common.submit')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
