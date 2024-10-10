<script lang="ts" setup>
import { string } from 'zod'

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
      title: t('logged_in'),
      color: 'green',
    })
    emit('confirmLoginCode')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      name: 'code',
      as: 'input',
      rules: string({ required_error: t('validation.required') }),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: t('code'),
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
        :button-label="t('submit')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
