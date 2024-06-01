<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { TwoFaAuthenticateBody } from '~/types/all-auth'

const emit = defineEmits(['twoFaAuthenticate'])

const { twoFaAuthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

async function onSubmit(values: TwoFaAuthenticateBody) {
  try {
    loading.value = true
    await twoFaAuthenticate({
      code: values.code,
    })
    toast.add({
      title: t('common.success.logged_in'),
      color: 'green',
    })
    emit('twoFaAuthenticate')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      const errors = 'errors' in error.data.data ? error.data.data.errors : []
      errors.forEach((error) => {
        toast.add({
          title: error.message,
          color: 'red',
        })
      })
      return
    }
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      name: 'code',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(6).max(6),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: '123456',
      type: 'text',
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
