<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { CodeConfirmBody } from '~/types/all-auth'

const emit = defineEmits(['confirmLoginCode'])

const { confirmLoginCode } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

async function onSubmit(values: CodeConfirmBody) {
  try {
    loading.value = true
    await confirmLoginCode(values)
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('confirmLoginCode')
  }
  catch (error) {
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
    await navigateTo('/account/login/code')
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('common.code'),
      name: 'code',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: t('common.code'),
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
